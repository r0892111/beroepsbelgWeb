import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { CookieBanner } from '@/components/layout/cookie-banner';
import { MainNav } from '@/components/layout/main-nav';
import { Footer } from '@/components/superdesign/Footer';
import { Toaster } from '@/components/ui/sonner';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { AdminProvider } from '@/lib/contexts/admin-context';
import { CartProvider } from '@/lib/contexts/cart-context';
import { FavoritesProvider } from '@/lib/contexts/favorites-context';
import { TourFavoritesProvider } from '@/lib/contexts/tour-favorites-context';
import { LocalBusinessJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  title: {
    default: 'BeroepsBelg | Stadsgids & City Guide België',
    template: '%s | BeroepsBelg',
  },
  description: 'Professionele stadsgids in België. Stadswandelingen, teambuilding en rondleidingen in Antwerpen, Brussel, Brugge, Gent en meer.',
  keywords: ['stadsgids', 'city guide', 'stadswandelingen', 'teambuilding', 'rondleidingen', 'Antwerpen', 'Brussel', 'Brugge', 'Gent', 'België', 'stadsgids antwerpen', 'guide in antwerp'],
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
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
    <>
      <LocalBusinessJsonLd />
      <NextIntlClientProvider messages={messages} locale={locale}>
        <AuthProvider>
          <AdminProvider>
            <CartProvider>
              <FavoritesProvider>
                <TourFavoritesProvider>
                  {/* Skip to main content link for screen readers */}
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--green-accent)] focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg"
                    aria-label="Skip to main content"
                  >
                    Skip to main content
                  </a>
                  
                  {/* Skip to navigation link */}
                  <a
                    href="#main-navigation"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--green-accent)] focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg focus:mt-12"
                    aria-label="Skip to navigation"
                  >
                    Skip to navigation
                  </a>

                  <div className="flex min-h-screen flex-col">
                    <MainNav locale={locale as Locale} />
                    <main id="main-content" className="flex-1" role="main" aria-label="Main content">
                      {children}
                    </main>
                    <Footer locale={locale as Locale} />
                  </div>
                  
                  {/* Aria live region for dynamic announcements */}
                  <div
                    id="aria-live-region"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                  />
                  
                  <CookieBanner />
                  <Toaster />
                  <ChatbotWidget locale={locale} />
                </TourFavoritesProvider>
              </FavoritesProvider>
            </CartProvider>
          </AdminProvider>
        </AuthProvider>
      </NextIntlClientProvider>
    </>
  );
}
