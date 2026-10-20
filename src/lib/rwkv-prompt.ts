import type { Message } from './chat-history';

/** Blank lines are reserved for the RWKV conversation's turn boundaries. */
export function normalizeInput(content: string): string {
  return content
    .replace(/\r\n?/g, '\n')
    .replace(/\n(?:[^\S\n]*\n)+/g, '\n')
    .trim();
}

export function completionPrompt(
  messages: Message[],
  thinking = false,
): string {
  const history = messages.map(({ role, content }) => {
    const clean = normalizeInput(content);
    if (role === 'user') return `User: ${clean}`;
    // Store completed think tags in historical turns, even after an interrupted
    // reasoning response. Only the new continuation uses an unfinished prefix.
    const answer = clean.startsWith('<think>')
      ? clean + (clean.includes('</think>') ? '' : '</think>')
      : `<think></think>${clean}`;
    return `Assistant: ${answer}`;
  });
  return [
    ...history,
    thinking ? 'Assistant: <think' : 'Assistant: <think></think',
  ].join('\n\n');
}

export function splitReasoning(content: string): {
  reasoning: string;
  answer: string;
  thinking: boolean;
} {
  if (!content.startsWith('<think>'))
    return { reasoning: '', answer: content, thinking: false };
  const end = content.indexOf('</think>');
  return end < 0
    ? { reasoning: content.slice(7), answer: '', thinking: true }
    : {
        reasoning: content.slice(7, end),
        answer: content.slice(end + 8).trimStart(),
        thinking: false,
      };
}
