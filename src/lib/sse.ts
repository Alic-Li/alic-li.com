/** OpenAI-compatible SSE; supports fragmented UTF-8 and CRLF event boundaries. */
export async function readCompletion(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => unknown,
  signal?: AbortSignal,
) {
  const reader = body.getReader();
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener('abort', abort, { once: true });
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;
  const consume = (line: string) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (data === '[DONE]') {
      completed = true;
      return;
    }
    if (!data) return;
    const event = JSON.parse(data);
    if (event.error) throw new Error('upstream_error');
    const choice = event.choices?.find(
      (choice: { index?: number }) =>
        choice.index === undefined || choice.index === 0,
    );
    const delta = choice?.delta?.content ?? choice?.text;
    if (typeof delta === 'string' && onText(delta) === false) completed = true;
  };
  try {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    while (!completed) {
      const { done, value } = await reader.read();
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      if (buffer.length > 1024 * 1024) throw new Error('event_too_large');
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        consume(line);
        if (completed) break;
      }
      if (done) {
        if (buffer.trim()) consume(buffer);
        if (!completed) throw new Error('incomplete_stream');
        break;
      }
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel();
    reader.releaseLock();
  }
}
