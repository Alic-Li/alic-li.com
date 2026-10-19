export type Message = { role: 'user' | 'assistant'; content: string };
/** Keep the newest context within the proxy's count, character and UTF-8 byte limits. */
export function requestMessages(messages: Message[], model: string): Message[] {
  const selected: Message[] = [];
  for (const message of messages.slice(-30).reverse()) {
    const item = {
      role: message.role,
      content: message.content.slice(0, 8000),
    };
    if (!item.content) continue;
    const candidate = [item, ...selected];
    const bytes = new TextEncoder().encode(
      JSON.stringify({ model, messages: candidate }),
    ).length;
    if (bytes > 32768) break;
    selected.unshift(item);
  }
  return selected;
}
