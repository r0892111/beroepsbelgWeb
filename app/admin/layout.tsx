import '../globals.css';
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import nlMessages from '@/messages/nl.json';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { AdminProvider } from '@/lib/contexts/admin-context';
import { CookieBanner } from '@/components/layout/cookie-banner';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

const messages = nlMessages as AbstractIntlMessages;

export const metadata: Metadata = {
  title: 'BeroepsBelg — Admin',
  description: 'Beheer de BeroepsBelg website.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className={`${inter.variable} ${playfair.variable} font-sans bg-sand`}>
        <NextIntlClientProvider messages={messages} locale="nl">
          <AuthProvider>
            <AdminProvider>
              <div className="min-h-screen">{children}</div>
              <CookieBanner />
              <Toaster />
            </AdminProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

