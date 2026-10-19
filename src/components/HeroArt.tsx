import { t, type Locale } from '../lib/i18n';

export default function HeroArt({ lang }: { lang: Locale }) {
  return (
    <figure className="hero-art">
      <div className="art-glow" aria-hidden="true" />
      <div className="raven-layer">
        <img
          src="/raven.png"
          width={1536}
          height={1024}
          alt={t(lang).ravenAlt}
          fetchPriority="high"
          decoding="async"
        />
      </div>
    </figure>
  );
}
