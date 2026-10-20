import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { createGlassLens } from '../lib/glass-lens';
import { navigate } from 'astro:transitions/client';

type Segment = { key: string; label: string; href: string; lang?: string };

export default function GlassSegments({
  items,
  selected,
  label,
  compact = false,
}: {
  items: Segment[];
  selected: string;
  label: string;
  compact?: boolean;
}) {
  const [active, setActive] = useState(selected);
  const [pressed, setPressed] = useState(false);
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lens = useRef<ReturnType<typeof createGlassLens>>(null);
  useEffect(() => {
    if (!root.current || !canvas.current) return;
    lens.current = createGlassLens(root.current, canvas.current);
    return () => {
      lens.current?.destroy();
      lens.current = null;
    };
  }, [items.map((item) => `${item.key}:${item.label}`).join('|')]);
  useEffect(() => {
    const item = items.find((item) => item.key === selected);
    if (item) lens.current?.select(item.href);
  }, [selected, items.map((item) => item.href).join('|')]);
  const gesture = useRef<{
    id: number;
    x: number;
    dragging: boolean;
    key: string;
  } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    setActive(selected);
    setPressed(false);
    gesture.current = null;
    suppressClick.current = false;
  }, [selected, items[0]?.href]);

  useEffect(() => {
    const release = () => {
      if (gesture.current) cancel();
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('blur', release);
    };
  }, [selected, items.map((item) => item.href).join('|')]);

  function select(item: Segment) {
    if (compact) {
      try {
        localStorage.setItem('language', item.key);
      } catch {}
    }
    setActive(item.key);
    lens.current?.select(item.href);
    if (item.key !== selected) void navigate(item.href);
  }
  function click(event: MouseEvent<HTMLAnchorElement>, item: Segment) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    select(item);
  }
  function pointerDown(event: PointerEvent<HTMLElement>) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    suppressClick.current = false;
    setPressed(true);
    lens.current?.press(true);
    const link = (event.target as Element).closest('a');
    lens.current?.select(
      link?.getAttribute('href') ??
        (items.find((item) => item.key === active) ?? items[0]).href,
    );
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      dragging: false,
      key: selected,
    };
  }
  function pointerMove(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.dragging && Math.abs(event.clientX - current.x) < 6) return;
    if (!current.dragging) {
      current.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    lens.current?.move(event.clientX);
    const links = Array.from(event.currentTarget.querySelectorAll('a'));
    const nearest = links.reduce(
      (best, link, index) => {
        const rect = link.getBoundingClientRect();
        const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
        return distance < best.distance ? { index, distance } : best;
      },
      { index: 0, distance: Infinity },
    );
    current.key = items[nearest.index].key;
    setActive(current.key);
  }
  function pointerUp(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    setPressed(false);
    lens.current?.press(false);
    if (!current.dragging) return;
    suppressClick.current = true;
    requestAnimationFrame(() => {
      suppressClick.current = false;
    });
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientY < rect.top - 24 || event.clientY > rect.bottom + 24) {
      setActive(selected);
      lens.current?.select(
        (items.find((item) => item.key === selected) ?? items[0]).href,
      );
    } else {
      select(items.find((item) => item.key === current.key)!);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function cancel() {
    gesture.current = null;
    setPressed(false);
    setActive(selected);
    lens.current?.press(false);
    lens.current?.select(
      (items.find((item) => item.key === selected) ?? items[0]).href,
    );
  }
  return (
    <nav
      ref={root}
      className={`glass-segments glass ${compact ? 'language-segments' : 'navigation-segments'}`}
      aria-label={label}
      data-pressed={pressed || undefined}
      onScroll={() => lens.current?.refresh()}
      onKeyDown={(event) => {
        const index = items.findIndex((item) => item.key === active);
        const next =
          event.key === 'ArrowRight'
            ? Math.min(items.length - 1, index + 1)
            : event.key === 'ArrowLeft'
              ? Math.max(0, index - 1)
              : event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : -1;
        if (next < 0) return;
        event.preventDefault();
        root.current?.querySelectorAll('a')[next]?.focus();
        select(items[next]);
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={cancel}
      onLostPointerCapture={() => {
        if (gesture.current) cancel();
      }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <canvas ref={canvas} className="glass-lens" aria-hidden="true" />
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          aria-label={item.label}
          lang={item.lang}
          draggable={false}
          aria-current={selected === item.key ? 'page' : undefined}
          data-active={active === item.key || undefined}
          onClick={(event) => click(event, item)}
        >
          {active === item.key && (
            <span className="glass-indicator" aria-hidden="true" />
          )}
          <span className="segment-label">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
