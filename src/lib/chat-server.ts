import { completionPrompt, normalizeInput } from './rwkv-prompt';
import { rwkvModels } from './rwkv-models';
import { continuationStream } from './rwkv-stream';
import type { Message } from './chat-history';

export interface ChatEnvironment {
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  CHAT_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}
export const chatConfigured = (env: ChatEnvironment) =>
  Boolean(
    env.CF_ACCESS_CLIENT_ID &&
    env.CF_ACCESS_CLIENT_SECRET &&
    env.CHAT_RATE_LIMITER,
  );
export const modelsFor = (env: ChatEnvironment) =>
  chatConfigured(env) ? rwkvModels.map((model) => model.id) : [];
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
  if (!chatConfigured(env)) return json('unavailable', 503);
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const { success } = await env.CHAT_RATE_LIMITER!.limit({ key: ip });
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
  const {
    model,
    messages,
    thinking = false,
  } = body as { model?: unknown; messages?: unknown; thinking?: unknown };
  if (
    typeof model !== 'string' ||
    !modelsFor(env).some((id) => id === model) ||
    typeof thinking !== 'boolean' ||
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
  const clean: Message[] = messages.map((m) => ({
    role: m.role as Message['role'],
    content: normalizeInput(m.content as string),
  }));
  if (
    clean.at(-1)?.role !== 'user' ||
    clean.some(
      (m, i) => !m.content || m.role !== (i % 2 ? 'assistant' : 'user'),
    )
  )
    return json('invalid_request', 400);
  try {
    const target = rwkvModels.find((target) => target.id === model)!;
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(90000),
    ]);
    const response = await fetch(`${target.origin}/v1/batch/completions`, {
      method: 'POST',
      headers: {
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID!,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET!,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        // Match the client profile accepted by the upstream edge gateway.
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        contents: [completionPrompt(clean, thinking)],
        stream: true,
        max_tokens: 2048,
        temperature: 1.0,
        top_k: 50,
        top_p: 0.3,
        alpha_presence: 1.0,
        alpha_frequency: 0.1,
        alpha_decay: 0.99,
        chunk_size: 1,
      }),
      signal,
      // workerd supports manual/follow only. Reject 3xx below so Access
      // credentials are never forwarded to a redirected destination.
      redirect: 'manual',
    });
    if (
      !response.ok ||
      !response.body ||
      !response.headers.get('Content-Type')?.includes('text/event-stream')
    ) {
      await response.body?.cancel();
      return json('upstream_error', 502);
    }
    return new Response(continuationStream(response.body, thinking, signal), {
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
