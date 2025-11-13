import '../globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { MainNav } from '@/components/layout/main-nav';
import SiteFooter from '@/components/design-system/SiteFooter';
import { CookieBanner } from '@/components/layout/cookie-banner';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/contexts/auth-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'BeroepsBelg — Uw gids in België',
  description: 'Ontdek België met professionele stadswandelingen in Antwerpen, Brussel, Brugge, Gent en meer.',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <header className="sticky top-0 z-40 bg-ivory border-b border-border">
                <MainNav locale={locale as Locale} />
              </header>
              <main className="flex-1">{children}</main>
              <SiteFooter locale={locale as Locale} />
            </div>
            <CookieBanner />
            <Toaster />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
