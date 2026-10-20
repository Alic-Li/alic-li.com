import { readCompletion } from './sse';

const stops = ['\n\nUser:', '\n\nAssistant:', '<|endoftext|>'];
const tailSize = Math.max(...stops.map((stop) => stop.length)) - 1;

/** Reframe provider events, complete the think prefix, and strip generated turn
 * markers even when they straddle SSE chunks. Upstream errors stay private. */
export function continuationStream(
  upstream: ReadableStream<Uint8Array>,
  thinking: boolean,
  signal: AbortSignal,
) {
  const cancelled = new AbortController();
  const abort = AbortSignal.any([signal, cancelled.signal]);
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let pending = '';
      let first = true;
      let stopped = false;
      const emit = (content: string) => {
        if (content && !abort.aborted)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content } }] })}\n\n`,
            ),
          );
      };
      void (async () => {
        try {
          await readCompletion(
            upstream,
            (chunk) => {
              if (!chunk) return;
              if (first) {
                first = false;
                // The supplied prompt deliberately leaves the final tag's > to
                // the continuation. Hide that delimiter from the displayed text.
                if (chunk.startsWith('>')) chunk = chunk.slice(1);
                if (thinking) emit('<think>');
              }
              pending += chunk;
              const hits = stops
                .map((stop) => pending.indexOf(stop))
                .filter((index) => index >= 0);
              if (hits.length) {
                emit(pending.slice(0, Math.min(...hits)));
                pending = '';
                stopped = true;
                return false;
              }
              if (pending.length > tailSize) {
                emit(pending.slice(0, -tailSize));
                pending = pending.slice(-tailSize);
              }
            },
            abort,
          );
          if (!stopped) emit(pending);
          if (!cancelled.signal.aborted) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        } catch {
          if (!cancelled.signal.aborted) {
            controller.enqueue(
              encoder.encode('data: {"error":"upstream_error"}\n\n'),
            );
            controller.close();
          }
        }
      })();
    },
    cancel() {
      cancelled.abort();
    },
  });
}
