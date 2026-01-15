import type { Metadata } from 'next';
import { type Locale, locales } from '@/i18n';

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Webshop | BeroepsBelg - Boeken, Merchandise & Meer',
    description: 'Ontdek de BeroepsBelg webshop met unieke boeken over België, merchandise en cadeau-artikelen. Bestel nu en steun lokale cultuur.',
  },
  en: {
    title: 'Webshop | BeroepsBelg - Books, Merchandise & More',
    description: 'Discover the BeroepsBelg webshop with unique books about Belgium, merchandise and gift items. Order now and support local culture.',
  },
  fr: {
    title: 'Boutique | BeroepsBelg - Livres, Marchandises & Plus',
    description: 'Découvrez la boutique BeroepsBelg avec des livres uniques sur la Belgique, des marchandises et des articles cadeaux. Commandez maintenant.',
  },
  de: {
    title: 'Webshop | BeroepsBelg - Bücher, Merchandise & Mehr',
    description: 'Entdecken Sie den BeroepsBelg Webshop mit einzigartigen Büchern über Belgien, Merchandise und Geschenkartikeln. Jetzt bestellen.',
  },
};

interface WebshopLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/webshop`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/webshop`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/webshop`,
      languages,
    },
  };
}

export default function WebshopLayout({ children }: WebshopLayoutProps) {
  return <>{children}</>;
}
