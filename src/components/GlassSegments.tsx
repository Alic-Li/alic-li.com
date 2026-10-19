import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
  const reduced = useReducedMotion();
  const gesture = useRef<{
    id: number;
    x: number;
    dragging: boolean;
    key: string;
  } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    setActive(selected);
    gesture.current = null;
    suppressClick.current = false;
  }, [selected, items[0]?.href]);

  function select(item: Segment) {
    if (compact) {
      try {
        localStorage.setItem('language', item.key);
      } catch {}
    }
    setActive(item.key);
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
    if (!current.dragging) return;
    suppressClick.current = true;
    requestAnimationFrame(() => {
      suppressClick.current = false;
    });
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientY < rect.top - 24 || event.clientY > rect.bottom + 24) {
      setActive(selected);
    } else {
      select(items.find((item) => item.key === current.key)!);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function cancel() {
    gesture.current = null;
    setActive(selected);
  }
  return (
    <nav
      className={`glass-segments glass ${compact ? 'language-segments' : 'navigation-segments'}`}
      aria-label={label}
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
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          lang={item.lang}
          draggable={false}
          aria-current={selected === item.key ? 'page' : undefined}
          data-active={active === item.key || undefined}
          onClick={(event) => click(event, item)}
        >
          {active === item.key && (
            <motion.span
              className="glass-indicator"
              layoutId={compact ? 'language-glass' : 'navigation-glass'}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 380, damping: 32 }
              }
            />
          )}
          <span className="segment-label">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
