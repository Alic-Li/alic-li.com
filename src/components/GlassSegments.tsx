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
  const pressedAt = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(releaseTimer.current), []);
  function releasePress() {
    clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(
      () => setPressed(false),
      Math.max(0, 240 - (performance.now() - pressedAt.current)),
    );
    lens.current?.press(false);
  }
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
    pointerType: string;
    key: string;
  } | null>(null);
  const suppressClickUntil = useRef(0);
  const touchContextUntil = useRef(0);
  useEffect(() => {
    setActive(selected);
    gesture.current = null;
  }, [selected, items[0]?.href]);

  useEffect(() => {
    const release = (event: globalThis.PointerEvent) => {
      if (gesture.current?.id === event.pointerId) cancel();
    };
    const blur = () => {
      if (gesture.current) cancel();
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('blur', blur);
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
      gesture.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    suppressClickUntil.current = 0;
    if (event.pointerType !== 'mouse') {
      event.preventDefault();
      touchContextUntil.current = performance.now() + 1500;
    }
    // Capture immediately: touch may otherwise be taken over by a native
    // link preview or leave the original anchor before the drag threshold.
    event.currentTarget.setPointerCapture(event.pointerId);
    clearTimeout(releaseTimer.current);
    pressedAt.current = performance.now();
    setPressed(true);
    lens.current?.press(true);
    const link = (event.target as Element).closest('a');
    lens.current?.select(
      link?.getAttribute('href') ??
        (items.find((item) => item.key === active) ?? items[0]).href,
    );
    const pressedItem = items.find(
      (item) => item.href === link?.getAttribute('href'),
    );
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      dragging: false,
      pointerType: event.pointerType,
      key: pressedItem?.key ?? selected,
    };
  }
  function pointerMove(event: PointerEvent<HTMLElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.dragging && Math.abs(event.clientX - current.x) < 6) return;
    current.dragging = true;
    if (event.pointerType !== 'mouse') event.preventDefault();
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
    releasePress();
    // Pointer capture retargets the compatibility click to the nav. Commit
    // taps and drags here, and suppress delayed mobile clicks across route swaps.
    suppressClickUntil.current = performance.now() + 500;
    if (current.pointerType !== 'mouse')
      touchContextUntil.current = performance.now() + 1500;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const outside = current.dragging
      ? event.clientY < rect.top - 24 || event.clientY > rect.bottom + 24
      : event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
    if (outside) {
      setActive(selected);
      lens.current?.select(
        (items.find((item) => item.key === selected) ?? items[0]).href,
      );
    } else {
      select(items.find((item) => item.key === current.key) ?? items[0]);
    }
  }
  function cancel() {
    const current = gesture.current;
    gesture.current = null;
    if (current) {
      suppressClickUntil.current = performance.now() + 500;
      if (root.current?.hasPointerCapture(current.id))
        root.current.releasePointerCapture(current.id);
    }
    releasePress();
    setActive(selected);
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
      onPointerCancel={(event) => {
        if (gesture.current?.id === event.pointerId) cancel();
      }}
      onLostPointerCapture={(event) => {
        // Touch initially captures to the anchor; ignore its lost-capture
        // event when ownership is transferred to the navigation container.
        if (
          event.target === event.currentTarget &&
          gesture.current?.id === event.pointerId
        )
          cancel();
      }}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => {
        if (
          gesture.current?.pointerType === 'touch' ||
          performance.now() < touchContextUntil.current
        )
          event.preventDefault();
      }}
      onClickCapture={(event) => {
        if (performance.now() < suppressClickUntil.current) {
          event.preventDefault();
          event.stopPropagation();
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
