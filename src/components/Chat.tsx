import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, Square, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { t, type Locale } from '../lib/i18n';
import { readCompletion } from '../lib/sse';
import { requestMessages, type Message } from '../lib/chat-history';
import { normalizeInput, splitReasoning } from '../lib/rwkv-prompt';
const storageKey = 'alic-chat-v1';
export default function Chat({ lang }: { lang: Locale }) {
  const d = t(lang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (
        Array.isArray(saved) &&
        saved.length <= 30 &&
        saved.every(
          (m) =>
            m &&
            ['user', 'assistant'].includes(m.role) &&
            typeof m.content === 'string' &&
            m.content.length <= 20000,
        )
      )
        setMessages(saved);
    } catch {
      setStorageError(true);
    }
    const abort = new AbortController();
    fetch('/api/models', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (
          !data ||
          typeof data !== 'object' ||
          !('models' in data) ||
          !Array.isArray(data.models) ||
          !data.models.every((m: unknown) => typeof m === 'string')
        )
          throw Error();
        setModels(data.models);
        setModel(data.models[0] || '');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(d.unavailable);
      })
      .finally(() => setLoading(false));
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [d.unavailable]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, busy]);
  function save(next: Message[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  }
  async function send(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || busy || !model) return;
    const next: Message[] = [
      ...messages.filter((m) => m.content).slice(-28),
      { role: 'user', content: normalizeInput(input) },
    ];
    let answer = '';
    const abort = new AbortController();
    controller.current = abort;
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    setError('');
    save(next);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: requestMessages(next, model, thinking),
          thinking,
        }),
        signal: abort.signal,
      });
      if (!response.ok || !response.body)
        throw new Error(
          response.status === 429
            ? d.rateError
            : response.status === 503
              ? d.unavailable
              : d.chatError,
        );
      await readCompletion(response.body, (text) => {
        answer += text;
        if (answer.length > 20000) {
          abort.abort();
          return;
        }
        setMessages([...next, { role: 'assistant', content: answer }]);
      });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setError(
          e instanceof Error && [d.rateError, d.unavailable].includes(e.message)
            ? e.message
            : d.chatError,
        );
    } finally {
      const final: Message[] = answer
        ? [...next, { role: 'assistant', content: answer }]
        : next;
      setMessages(final);
      save(final);
      setBusy(false);
      controller.current = null;
    }
  }
  return (
    <>
      <div className="chat-panel">
        <div className="chat-toolbar">
          <label htmlFor="model">{d.model}</label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={busy || !models.length}
          >
            {!models.length && <option value="">—</option>}
            {models.map((m) => (
              <option key={m} value={m}>
                {m.replace('rwkv-', 'RWKV ').toUpperCase()}
              </option>
            ))}
          </select>
          <label className="think-toggle">
            <input
              type="checkbox"
              checked={thinking}
              onChange={(event) => setThinking(event.target.checked)}
              disabled={busy}
            />
            {d.enableThinking}
          </label>
          <Button
            variant="ghost"
            size="icon"
            aria-label={d.clear}
            disabled={busy || !messages.length}
            onClick={() => {
              setMessages([]);
              save([]);
              setError('');
            }}
          >
            <Trash2 size={16} />
          </Button>
        </div>
        <div
          className="messages"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-busy={busy}
        >
          {!messages.length && (
            <div className="chat-empty">
              <h2>{d.chatEmpty}</h2>
              <p>{d.chatHint}</p>
            </div>
          )}
          {messages.map((m, i) => {
            const parts =
              m.role === 'assistant'
                ? splitReasoning(m.content)
                : { reasoning: '', answer: m.content, thinking: false };
            return (
              <div className={`message ${m.role}`} key={i}>
                <div className="message-label">
                  {m.role === 'user' ? d.you : d.assistant}
                </div>
                <div className="prose">
                  {(parts.reasoning || parts.thinking) && (
                    <details className="reasoning">
                      <summary>
                        {busy && parts.thinking ? d.thinking : d.reasoning}
                      </summary>
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {parts.reasoning}
                      </Markdown>
                    </details>
                  )}
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {parts.answer || (!m.content ? d.loading : '')}
                  </Markdown>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        <form className="composer" onSubmit={send}>
          <textarea
            aria-label={d.placeholder}
            placeholder={d.placeholder}
            value={input}
            maxLength={8000}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy || !model}
            rows={2}
          />
          {busy ? (
            <Button
              type="button"
              onClick={() => controller.current?.abort()}
              aria-label={d.stop}
            >
              <Square size={17} />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim() || !model || loading}
              aria-label={d.send}
            >
              <ArrowUp size={18} />
            </Button>
          )}
        </form>
        {loading && (
          <p className="chat-notice" role="status">
            {d.loading}
          </p>
        )}
        {!loading && !models.length && !error && (
          <p className="chat-notice" role="status">
            {d.unavailable}
          </p>
        )}
        {error && (
          <p className="chat-notice error" role="alert">
            {error}
          </p>
        )}
        {storageError && (
          <p className="chat-notice" role="status">
            {d.storageError}
          </p>
        )}
      </div>
      <p className="privacy">{d.privacy}</p>
    </>
  );
}
