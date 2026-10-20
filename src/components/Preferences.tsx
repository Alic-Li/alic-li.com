import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import GlassSegments from './GlassSegments';
import { Button } from './ui/button';
import { t, pathFor, type Locale } from '../lib/i18n';
export default function Preferences({
  lang,
  alternate,
  path,
}: {
  lang: Locale;
  alternate: string;
  path: string;
}) {
  const d = t(lang);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () =>
      setDark(document.documentElement.dataset.theme === 'dark');
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('appearance', next);
    } catch {}
    window.dispatchEvent(
      new CustomEvent('appearance-change', { detail: next }),
    );
  }
  return (
    <div className="preferences">
      <GlassSegments
        compact
        label={d.language}
        selected={lang}
        items={[
          {
            key: 'en',
            label: 'EN',
            href: lang === 'en' ? pathFor('en', path) : alternate,
            lang: 'en',
          },
          {
            key: 'zh',
            label: '中文',
            href: lang === 'zh' ? pathFor('zh', path) : alternate,
            lang: 'zh-CN',
          },
        ]}
      />
      <Button
        variant="ghost"
        size="icon"
        className="theme-trigger glass"
        aria-label={dark ? d.switchToLight : d.switchToDark}
        title={dark ? d.switchToLight : d.switchToDark}
        onClick={toggleTheme}
      >
        <Sun className="theme-sun" size={17} aria-hidden="true" />
        <Moon className="theme-moon" size={17} aria-hidden="true" />
      </Button>
    </div>
  );
}
