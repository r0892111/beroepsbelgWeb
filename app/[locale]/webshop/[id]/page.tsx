import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/api/content';
import { ProductDetailPage } from './product-detail-page';
import type { Locale } from '@/lib/data/types';
import { locales } from '@/i18n';
import type { Metadata } from 'next';
import { ProductJsonLd } from '@/components/seo/json-ld';

interface ProductDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://beroepsbelg.be';

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return {
      title: 'Product Not Found | BeroepsBelg',
    };
  }

  const title = `${product.title[locale] || product.title.nl} | BeroepsBelg Webshop`;
  const description = product.description[locale] || product.description.nl || '';
  const metaDescription = description.length > 160 
    ? description.substring(0, 157) + '...'
    : description;
  const url = `${BASE_URL}/${locale}/webshop/${id}`;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/webshop/${id}`;
  });

  return {
    title,
    description: metaDescription,
    openGraph: {
      title,
      description: metaDescription,
      url,
      siteName: 'BeroepsBelg',
      type: 'website',
      images: product.image ? [{ url: product.image, alt: product.title[locale] || product.title.nl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
      images: product.image ? [product.image] : [],
    },
    alternates: {
      canonical: url,
      languages,
    },
  };
}

export default async function ProductPage({ params }: ProductDetailPageProps) {
  const { locale, id } = await params;

  if (!id || typeof id !== 'string') {
    notFound();
  }

  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const url = `${BASE_URL}/${locale}/webshop/${id}`;

  return (
    <>
      <ProductJsonLd
        name={product.title[locale] || product.title.nl}
        description={product.description[locale] || product.description.nl || ''}
        image={product.image}
        price={product.price}
        url={url}
        category={product.category}
        sku={product.uuid}
      />
      <ProductDetailPage product={product} locale={locale} />
    </>
  );
}

