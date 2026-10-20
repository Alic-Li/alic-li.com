import { normalizeInput } from './rwkv-prompt';

export type Message = { role: 'user' | 'assistant'; content: string };
/** Keep the newest context within the proxy's count, character and UTF-8 byte limits. */
export function requestMessages(
  messages: Message[],
  model: string,
  thinking = false,
): Message[] {
  const context: Message[] = [];
  for (const message of messages) {
    const content = normalizeInput(message.content).slice(0, 8000);
    if (!content) continue;
    const previous = context.at(-1);
    // Failed/stopped requests can leave consecutive user messages in storage.
    if (previous?.role === message.role)
      previous.content = `${previous.content}\n${content}`.slice(-8000);
    else context.push({ role: message.role, content });
  }
  const selected: Message[] = [];
  for (const message of context.slice(-30).reverse()) {
    const item = {
      role: message.role,
      content: message.content.slice(0, 8000),
    };
    if (!item.content) continue;
    const candidate = [item, ...selected];
    const bytes = new TextEncoder().encode(
      JSON.stringify({ model, messages: candidate, thinking }),
    ).length;
    if (bytes > 32768) break;
    selected.unshift(item);
  }
  while (selected[0]?.role === 'assistant') selected.shift();
  return selected;
}
