import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BeroepsBelg',
  description: 'Ontdek België met professionele stadswandelingen',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Default to 'nl' as it's the default locale in middleware
  // The actual locale-specific lang is handled by next-intl in the locale layout
  return (
    <html lang="nl" className="h-full">
      <body className={`${inter.className} h-full`}>{children}</body>
    </html>
  );
}
