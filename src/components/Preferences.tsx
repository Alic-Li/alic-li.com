import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import GlassSegments from './GlassSegments';
import { Button } from './ui/button';
import { t, pathFor, type Locale } from '../lib/i18n';
type Theme = 'system' | 'light' | 'dark';
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
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    try {
      const value = localStorage.getItem('appearance');
      if (value === 'light' || value === 'dark') setTheme(value);
    } catch {}
  }, []);
  function changeTheme(value: string) {
    const next = value as Theme;
    setTheme(next);
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="theme-trigger glass"
            aria-label={d.appearance}
          >
            <Sun className="theme-sun" size={17} />
            <Moon className="theme-moon" size={17} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="dropdown glass"
            align="end"
            sideOffset={12}
          >
            <DropdownMenu.Label className="dropdown-label">
              {d.appearance}
            </DropdownMenu.Label>
            <DropdownMenu.RadioGroup value={theme} onValueChange={changeTheme}>
              {(['system', 'light', 'dark'] as const).map((value, index) => {
                const Icon = [Monitor, Sun, Moon][index];
                return (
                  <DropdownMenu.RadioItem
                    className="dropdown-item"
                    value={value}
                    key={value}
                  >
                    <Icon size={15} />
                    {d[value]}
                    <DropdownMenu.ItemIndicator className="ml-auto">
                      <Check size={14} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.RadioItem>
                );
              })}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
