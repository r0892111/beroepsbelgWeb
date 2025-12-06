import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale: 'nl',
  localePrefix: 'always'
});

export const config = {
  matcher: ['/((?!api|auth|admin|_next|_vercel|.*\\..*).*)']
};
