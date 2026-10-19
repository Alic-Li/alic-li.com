import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';

type Segment = { key: string; label: string; href: string; lang?: string };

// Native links retain keyboard, modifier-click, and no-JavaScript behavior.
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function navigate(event: MouseEvent<HTMLAnchorElement>, item: Segment) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (compact) {
      try {
        localStorage.setItem('language', item.key);
      } catch {}
    }
    if (item.key === selected) return;
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    setActive(item.key);
    timer.current = setTimeout(
      () => window.location.assign(item.href),
      reduced ? 0 : 220,
    );
  }
  return (
    <nav
      className={`glass-segments glass ${compact ? 'language-segments' : 'navigation-segments'}`}
      aria-label={label}
    >
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          lang={item.lang}
          aria-current={selected === item.key ? 'page' : undefined}
          data-active={active === item.key || undefined}
          onClick={(event) => navigate(event, item)}
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
