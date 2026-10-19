/** OpenAI-compatible SSE; supports fragmented UTF-8 and CRLF event boundaries. */
export async function readCompletion(
  body: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
) {
  const reader = body.getReader();
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
    const delta = event.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') onText(delta);
  };
  try {
    while (!completed) {
      const { done, value } = await reader.read();
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
    await reader.cancel();
    reader.releaseLock();
  }
}
