import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { t, type Locale } from '../lib/i18n';
type Theme = 'system' | 'light' | 'dark';
export default function Preferences({
  lang,
  alternate,
}: {
  lang: Locale;
  alternate: string;
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={d.language}>
            <Languages size={17} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="dropdown glass"
            align="end"
            sideOffset={12}
          >
            {(['en', 'zh'] as const).map((value) => (
              <DropdownMenu.Item key={value} asChild>
                <a
                  className="dropdown-item"
                  href={value === lang ? undefined : alternate}
                  lang={value === 'zh' ? 'zh-CN' : 'en'}
                  onClick={() => {
                    try {
                      localStorage.setItem('language', value);
                    } catch {}
                  }}
                >
                  {value === 'en' ? 'English' : '简体中文'}
                  {value === lang && <Check size={14} />}
                </a>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label={d.appearance}>
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
