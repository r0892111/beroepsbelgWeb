'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

interface LangSwitcherProps {
  locale: Locale;
}

export function LangSwitcher({ locale }: LangSwitcherProps) {
  const pathname = usePathname();

  const getLocalizedPath = (newLocale: Locale) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    return segments.join('/');
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((loc, index) => (
        <span key={loc} className="flex items-center">
          {index > 0 && <span className="mx-1.5 text-muted-foreground">|</span>}
          <Link
            href={getLocalizedPath(loc)}
            className={
              loc === locale
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground transition-colors hover:text-foreground'
            }
          >
            {loc.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  );
}
