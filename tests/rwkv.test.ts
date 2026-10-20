import { afterEach, expect, mock, test } from 'bun:test';
import {
  handleChat,
  modelsFor,
  type ChatEnvironment,
} from '../src/lib/chat-server';
import { requestMessages } from '../src/lib/chat-history';
import {
  completionPrompt,
  normalizeInput,
  splitReasoning,
} from '../src/lib/rwkv-prompt';
import { continuationStream } from '../src/lib/rwkv-stream';
import { readCompletion } from '../src/lib/sse';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const env: ChatEnvironment = {
  CF_ACCESS_CLIENT_ID: 'test-id.access',
  CF_ACCESS_CLIENT_SECRET: 'test-secret',
  CHAT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const history = [
  { role: 'user' as const, content: ' first\r\n\r\nline\n \t\nend ' },
  { role: 'assistant' as const, content: 'answer\n\nparagraph' },
  { role: 'user' as const, content: 'next' },
];
function request(data: unknown) {
  return new Request('https://alic-li.com/api/chat', {
    method: 'POST',
    headers: {
      Origin: 'https://alic-li.com',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
function events(chunks: string[], done = true) {
  return (
    chunks
      .map(
        (content) =>
          `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content } }] })}\r\n\r\n`,
      )
      .join('') + (done ? 'data: [DONE]\r\n\r\n' : '')
  );
}
async function output(stream: ReadableStream<Uint8Array>) {
  let content = '';
  await readCompletion(stream, (chunk) => {
    content += chunk;
  });
  return content;
}

test('normalizes internal blank lines and preserves exact raw continuation prefixes', () => {
  expect(normalizeInput('a\r\n\r\nb\n\t \n\n\nc\rd')).toBe('a\nb\nc\nd');
  const prefix =
    'User: first\nline\nend\n\nAssistant: <think></think>answer\nparagraph\n\nUser: next\n\nAssistant: ';
  expect(completionPrompt(history)).toBe(prefix + '<think></think');
  expect(completionPrompt(history, true)).toBe(prefix + '<think');
});

test('historical reasoning is retained and interrupted think blocks are closed', () => {
  expect(
    completionPrompt([
      { role: 'user', content: 'question' },
      { role: 'assistant', content: '<think>partial reasoning' },
      { role: 'user', content: 'continue' },
    ]),
  ).toContain('Assistant: <think>partial reasoning</think>\n\nUser: continue');
  expect(splitReasoning('<think>reason</think>\nanswer')).toEqual({
    reasoning: 'reason',
    answer: 'answer',
    thinking: false,
  });
  expect(splitReasoning('<think>partial')).toEqual({
    reasoning: 'partial',
    answer: '',
    thinking: true,
  });
});

test('context survives failed requests and stays within the full JSON budget with thinking enabled', () => {
  const messages = requestMessages(
    [
      { role: 'assistant', content: 'orphan' },
      { role: 'user', content: 'failed request' },
      { role: 'user', content: 'retry\n\nplease' },
    ],
    'rwkv-7b',
    true,
  );
  expect(messages).toEqual([
    { role: 'user', content: 'failed request\nretry\nplease' },
  ]);
  const large = requestMessages(
    [
      ...Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 ? ('assistant' as const) : ('user' as const),
        content: '中'.repeat(8000),
      })),
      { role: 'user', content: 'latest' },
    ],
    'rwkv-13b',
    true,
  );
  expect(large[0]?.role).toBe('user');
  expect(large.at(-1)?.content).toBe('latest');
  expect(
    new TextEncoder().encode(
      JSON.stringify({ model: 'rwkv-13b', messages: large, thinking: true }),
    ).length,
  ).toBeLessThanOrEqual(32768);
});

test('all four stable model choices route only to their fixed raw batch endpoint', async () => {
  expect(modelsFor({})).toEqual([]);
  expect(modelsFor({ ...env, CF_ACCESS_CLIENT_SECRET: undefined })).toEqual([]);
  const targets = ['api-1b5', 'api-3b', 'api-7b', 'api-13b'];
  let index = 0;
  globalThis.fetch = mock(async (url: unknown, init?: RequestInit) => {
    expect(String(url)).toBe(
      `https://${targets[index++]}.rwkvos.com/v1/batch/completions`,
    );
    expect(new Headers(init?.headers).get('CF-Access-Client-Secret')).toBe(
      'test-secret',
    );
    expect(JSON.parse(init!.body as string).contents).toEqual([
      completionPrompt(history, true),
    ]);
    return new Response(events(['>hello']), {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }) as unknown as typeof fetch;
  for (const model of modelsFor(env)) {
    const response = await handleChat(
      request({
        model,
        messages: history,
        thinking: true,
        endpoint: 'https://attacker.example',
      }),
      env,
    );
    expect(response.status).toBe(200);
    expect(await output(response.body!)).toBe('<think>hello');
  }
  expect(index).toBe(4);
});

test('reframes fragmented SSE and removes next-turn stop markers split over chunks', async () => {
  for (const stop of ['\n\nUser:', '\n\nAssistant:', '<|endoftext|>']) {
    const source = events(['>', '你好', ...stop.split(''), 'must not leak']);
    const bytes = new TextEncoder().encode(source);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    expect(
      await output(
        continuationStream(stream, false, new AbortController().signal),
      ),
    ).toBe('你好');
  }
});

test('preserves Markdown paragraphs, closes the think prefix, and filters other batch slots', async () => {
  const source =
    'data: {"choices":[{"index":1,"delta":{"content":"wrong slot"}}]}\n\n' +
    events(['>', 'reason\n\nmore', '</think>\nanswer\n\nparagraph']);
  const answer = await output(
    continuationStream(
      new Response(source).body!,
      true,
      new AbortController().signal,
    ),
  );
  expect(answer).toBe('<think>reason\n\nmore</think>\nanswer\n\nparagraph');
});

test('stream errors are sanitized and downstream cancellation cancels the upstream reader', async () => {
  const broken = new Response('data: {"error":"private-provider-details"}\n\n');
  const wrapped = new Response(
    continuationStream(broken.body!, false, new AbortController().signal),
  );
  expect(await wrapped.text()).toBe('data: {"error":"upstream_error"}\n\n');
  let cancelled = false;
  const waiting = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const stream = continuationStream(
    waiting,
    false,
    new AbortController().signal,
  );
  await stream.cancel();
  await Promise.resolve();
  expect(cancelled).toBe(true);
});

test('upstream timeouts finish with a sanitized error instead of leaving the response hanging', async () => {
  const timedOut = new AbortController();
  let cancelled = false;
  const upstream = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const response = new Response(
    continuationStream(upstream, false, timedOut.signal),
  );
  timedOut.abort(
    new DOMException('private upstream timeout detail', 'TimeoutError'),
  );
  expect(await response.text()).toBe('data: {"error":"upstream_error"}\n\n');
  expect(cancelled).toBe(true);
});

test('a generated next-turn marker ends the stream and cancels an otherwise open upstream', async () => {
  let cancelled = false;
  const upstream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(events(['>answer\n\nUser:'], false)),
      );
    },
    cancel() {
      cancelled = true;
    },
  });
  expect(
    await output(
      continuationStream(upstream, false, new AbortController().signal),
    ),
  ).toBe('answer');
  expect(cancelled).toBe(true);
});

test('uses the Worker-supported manual redirect mode and rejects redirected upstreams', async () => {
  let calls = 0;
  globalThis.fetch = mock(async (_url: unknown, init?: RequestInit) => {
    calls++;
    expect(init?.redirect).toBe('manual');
    return new Response('private redirect response', {
      status: 302,
      headers: { Location: 'https://other.example/login' },
    });
  }) as unknown as typeof fetch;
  const response = await handleChat(
    request({
      model: 'rwkv-1.5b',
      messages: [{ role: 'user', content: 'hello' }],
    }),
    env,
  );
  expect(response.status).toBe(502);
  expect(await response.text()).toBe('{"error":"upstream_error"}');
  expect(calls).toBe(1);
});
