import { lazy, Suspense, useEffect, useState } from 'react';
import { t, type Locale } from '../lib/i18n';
import { motion, useReducedMotion } from 'motion/react';
const LiquidGlass = lazy(() => import('liquid-glass-react'));
export default function HeroArt({ lang }: { lang: Locale }) {
  const d = t(lang);
  const reduced = useReducedMotion();
  const [optics, setOptics] = useState(false);
  useEffect(() => {
    setOptics(
      CSS.supports('backdrop-filter', 'url(#glass)') &&
        /Chrome|Chromium|Edg\//.test(navigator.userAgent) &&
        !matchMedia(
          '(prefers-reduced-motion: reduce), (prefers-contrast: more), (forced-colors: active), (max-width: 760px)',
        ).matches,
    );
  }, []);
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="art-glow" />
      <div className="orbit" />
      <div className="orbit second" />
      <span className="tiny-cross">+</span>
      <motion.div
        animate={reduced ? {} : { y: [0, -9, 0] }}
        transition={{ duration: 9, repeat: 2, ease: 'easeInOut' }}
      >
        <div className="art-core" />
      </motion.div>
      {optics && (
        <Suspense fallback={null}>
          <LiquidGlass
            displacementScale={25}
            blurAmount={0.1}
            elasticity={0}
            aberrationIntensity={1}
            cornerRadius={24}
            padding="10px 18px"
            style={{ position: 'absolute', top: '73%', left: '73%' }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--foreground)',
              }}
            >
              {d.artExplore}
            </span>
          </LiquidGlass>
        </Suspense>
      )}
      <span className="art-caption">{d.artCaption}</span>
    </div>
  );
}
