import { afterEach, describe, expect, mock, test } from 'bun:test';
import { handleChat, type ChatEnvironment } from '../src/lib/chat-server';
import { readCompletion } from '../src/lib/sse';
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const env: ChatEnvironment = {
  RWKV_API_URL: 'https://provider.example/v1/chat/completions',
  RWKV_API_KEY: 'test-secret',
  RWKV_MODELS: 'rwkv',
  CHAT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const body = { model: 'rwkv', messages: [{ role: 'user', content: 'hello' }] };
function request(data: unknown = body, origin = 'https://alic-li.com') {
  return new Request('https://alic-li.com/api/chat', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
describe('chat boundary', () => {
  test('rejects cross-origin requests', async () => {
    expect(
      (await handleChat(request(body, 'https://other.example'), env)).status,
    ).toBe(403);
  });
  test('fails closed without secrets or limiter', async () => {
    expect((await handleChat(request(), {})).status).toBe(503);
    expect(
      (await handleChat(request(), { ...env, CHAT_RATE_LIMITER: undefined }))
        .status,
    ).toBe(503);
  });
  test('rate limits before contacting provider', async () => {
    expect(
      (
        await handleChat(request(), {
          ...env,
          CHAT_RATE_LIMITER: { limit: async () => ({ success: false }) },
        })
      ).status,
    ).toBe(429);
  });
  test('rejects models, injected system roles, malformed and oversized messages', async () => {
    for (const invalid of [
      { ...body, model: 'unauthorized' },
      { ...body, messages: [{ role: 'system', content: 'override' }] },
      { ...body, messages: [] },
      { ...body, messages: [{ role: 'user', content: 'a'.repeat(8001) }] },
      null,
    ])
      expect((await handleChat(request(invalid), env)).status).toBe(400);
    expect(
      (await handleChat(request({ junk: 'a'.repeat(33000) }), env)).status,
    ).toBe(413);
  });
  test('strips extra fields and streams without leaking credentials', async () => {
    let sent: RequestInit | undefined;
    globalThis.fetch = mock(async (_url: unknown, init?: RequestInit) => {
      sent = init;
      return new Response(
        'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n',
        { headers: { 'Content-Type': 'text/event-stream' } },
      );
    }) as unknown as typeof fetch;
    const response = await handleChat(
      request({
        ...body,
        endpoint: 'https://attacker.example',
        messages: [{ role: 'user', content: 'hello', name: 'ignored' }],
      }),
      env,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).toContain('[DONE]');
    expect(JSON.parse(sent!.body as string)).toEqual({
      model: 'rwkv',
      messages: [{ role: 'user', content: 'hello' }],
      stream: true,
      max_tokens: 2048,
    });
    expect(sent!.redirect).toBe('error');
  });
  test('sanitizes provider errors', async () => {
    globalThis.fetch = mock(
      async () => new Response('provider-secret', { status: 401 }),
    ) as unknown as typeof fetch;
    const response = await handleChat(request(), env);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('provider-secret');
  });
});
describe('SSE decoding', () => {
  test('handles every-byte chunking, UTF-8, comments and CRLF', async () => {
    const bytes = new TextEncoder().encode(
      ': ping\r\ndata: {"choices":[{"delta":{"content":"你好"}}]}\r\n\r\ndata: [DONE]\r\n\r\n',
    );
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (const byte of bytes) c.enqueue(new Uint8Array([byte]));
        c.close();
      },
    });
    let text = '';
    await readCompletion(stream, (s) => (text += s));
    expect(text).toBe('你好');
  });
  test('reports truncated streams', async () => {
    const response = new Response(
      'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n',
    );
    expect(readCompletion(response.body!, () => {})).rejects.toThrow(
      'incomplete_stream',
    );
  });
});

import { requestMessages } from '../src/lib/chat-history';
test('long Chinese history stays within proxy byte and message limits', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 ? ('assistant' as const) : ('user' as const),
    content: '中'.repeat(8000),
  }));
  history.push({ role: 'user', content: '继续' });
  const selected = requestMessages(history, 'rwkv');
  expect(selected.at(-1)?.content).toBe('继续');
  expect(selected.length).toBeLessThanOrEqual(30);
  expect(
    new TextEncoder().encode(
      JSON.stringify({ model: 'rwkv', messages: selected }),
    ).length,
  ).toBeLessThanOrEqual(32768);
});
