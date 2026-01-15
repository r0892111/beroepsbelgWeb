import type { Metadata } from 'next';
import { type Locale, locales } from '@/i18n';

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Contact | BeroepsBelg - Neem Contact Met Ons Op',
    description: 'Neem contact op met BeroepsBelg voor vragen over stadswandelingen, boekingen of samenwerkingen. Wij helpen u graag verder.',
  },
  en: {
    title: 'Contact | BeroepsBelg - Get In Touch',
    description: 'Contact BeroepsBelg for questions about city tours, bookings or collaborations. We are happy to help you.',
  },
  fr: {
    title: 'Contact | BeroepsBelg - Contactez-Nous',
    description: 'Contactez BeroepsBelg pour des questions sur les visites guidées, réservations ou collaborations. Nous sommes heureux de vous aider.',
  },
  de: {
    title: 'Kontakt | BeroepsBelg - Kontaktieren Sie Uns',
    description: 'Kontaktieren Sie BeroepsBelg für Fragen zu Stadtführungen, Buchungen oder Kooperationen. Wir helfen Ihnen gerne weiter.',
  },
};

interface ContactLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/contact/contactformulier`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/contact/contactformulier`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/contact/contactformulier`,
      languages,
    },
  };
}

export default function ContactLayout({ children }: ContactLayoutProps) {
  return <>{children}</>;
}
