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

export const metadata: Metadata = {
  title: 'BeroepsBelg',
  description: 'Ontdek België met professionele stadswandelingen in Antwerpen, Brussel, Brugge, Gent en meer.',
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
    <NextIntlClientProvider messages={messages} locale={locale}>
      <AuthProvider>
        <AdminProvider>
          <CartProvider>
            <FavoritesProvider>
              <div className="flex min-h-screen flex-col">
                <MainNav locale={locale as Locale} />
                <main className="flex-1">{children}</main>
                <Footer locale={locale as Locale} />
              </div>
              <CookieBanner />
              <Toaster />
              <ChatbotWidget locale={locale} />
            </FavoritesProvider>
          </CartProvider>
        </AdminProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
