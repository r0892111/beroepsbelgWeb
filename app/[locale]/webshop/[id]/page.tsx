import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/api/content';
import { ProductDetailPage } from './product-detail-page';
import type { Locale } from '@/lib/data/types';

interface ProductDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductPage({ params }: ProductDetailPageProps) {
  const { locale, id } = await params;

  if (!id || typeof id !== 'string') {
    notFound();
  }

  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailPage product={product} locale={locale} />;
}

