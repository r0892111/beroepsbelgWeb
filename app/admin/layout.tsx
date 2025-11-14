'use client';

import { AuthProvider } from '@/lib/contexts/auth-context';
import { NextIntlClientProvider } from 'next-intl';
import nlMessages from '@/messages/nl.json';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextIntlClientProvider messages={nlMessages} locale="nl">
      <AuthProvider>
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

