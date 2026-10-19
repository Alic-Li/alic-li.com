export interface ChatEnvironment {
  RWKV_API_URL?: string;
  RWKV_API_KEY?: string;
  RWKV_MODELS?: string;
  CHAT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}
export const modelsFor = (env: ChatEnvironment) =>
  (env.RWKV_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const json = (
  error: string,
  status: number,
  extra: Record<string, string> = {},
) =>
  Response.json(
    { error },
    { status, headers: { 'Cache-Control': 'no-store', ...extra } },
  );
export async function handleChat(
  request: Request,
  env: ChatEnvironment,
): Promise<Response> {
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return json('forbidden', 403);
  if (
    !request.headers
      .get('Content-Type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    return json('invalid_request', 415);
  if (
    !env.RWKV_API_URL ||
    !env.RWKV_API_KEY ||
    !modelsFor(env).length ||
    !env.CHAT_RATE_LIMITER
  )
    return json('unavailable', 503);
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const { success } = await env.CHAT_RATE_LIMITER.limit({ key: ip });
  if (!success) return json('rate_limited', 429, { 'Retry-After': '60' });
  // Read with a byte ceiling rather than trusting Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return json('invalid_request', 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      return json('too_large', 413);
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json('invalid_request', 400);
  }
  if (!body || typeof body !== 'object') return json('invalid_request', 400);
  const { model, messages } = body as { model?: unknown; messages?: unknown };
  if (
    typeof model !== 'string' ||
    !modelsFor(env).includes(model) ||
    !Array.isArray(messages) ||
    messages.length < 1 ||
    messages.length > 30
  )
    return json('invalid_request', 400);
  if (
    !messages.every(
      (m) =>
        m &&
        typeof m === 'object' &&
        ['user', 'assistant'].includes(m.role) &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= 8000,
    )
  )
    return json('invalid_request', 400);
  const clean = messages.map((m) => ({
    role: m.role as string,
    content: m.content as string,
  }));
  if (clean.at(-1)?.role !== 'user') return json('invalid_request', 400);
  try {
    const url = new URL(env.RWKV_API_URL);
    if (url.protocol !== 'https:') return json('unavailable', 503);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RWKV_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        messages: clean,
        stream: true,
        max_tokens: 2048,
      }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(90000)]),
      redirect: 'error',
    });
    if (
      !response.ok ||
      !response.body ||
      !response.headers.get('Content-Type')?.includes('text/event-stream')
    ) {
      await response.body?.cancel();
      return json('upstream_error', 502);
    }
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return json('upstream_error', 502);
  }
}
