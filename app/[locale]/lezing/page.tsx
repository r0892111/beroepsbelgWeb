import { type Locale } from '@/i18n';
import { getLectures } from '@/lib/api/content';
import LezingClientPage from './client-page';

// Force dynamic rendering to always fetch fresh data (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface LezingPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function LezingPage({ params }: LezingPageProps) {
  const { locale } = await params;
  const lectures = await getLectures();

  return <LezingClientPage lectures={lectures} locale={locale} />;
}
