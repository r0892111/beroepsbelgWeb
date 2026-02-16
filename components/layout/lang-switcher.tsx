'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

interface LangSwitcherProps {
  locale: Locale;
}

export function LangSwitcher({ locale }: LangSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getLocalizedPath = (newLocale: Locale) => {
    if (!pathname) {
      return `/${newLocale}`;
    }
    
    const segments = pathname.split('/').filter(Boolean);
    
    // If first segment is a locale, replace it
    if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
      segments[0] = newLocale;
    } else {
      // Otherwise, prepend the locale
      segments.unshift(newLocale);
    }
    
    const newPath = `/${segments.join('/')}`;
    
    // Preserve query parameters
    const queryString = searchParams.toString();
    return queryString ? `${newPath}?${queryString}` : newPath;
  };

  const localeNames: Record<Locale, string> = {
    nl: 'Nederlands',
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
  };

  return (
    <div 
      className="flex items-center gap-1 text-sm"
      role="group"
      aria-label="Language selector"
    >
      {locales.map((loc, index) => (
        <span key={loc} className="flex items-center">
          {index > 0 && (
            <span className="mx-1.5 text-muted-foreground" aria-hidden="true">|</span>
          )}
          <Link
            href={getLocalizedPath(loc)}
            className={
              loc === locale
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground transition-colors hover:text-foreground'
            }
            aria-label={`Switch to ${localeNames[loc] || loc} language`}
            aria-current={loc === locale ? 'page' : undefined}
            lang={loc}
          >
            {loc.toUpperCase()}
          </Link>
        </span>
      ))}
    </div>
  );
}
