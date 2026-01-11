import { getRequestConfig } from 'next-intl/server';

export const locales = ['nl', 'en', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    return {
      locale: 'nl',
      messages: (await import(`./messages/nl.json`)).default
    };
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
