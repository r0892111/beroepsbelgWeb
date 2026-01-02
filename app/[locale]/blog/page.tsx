import { getTranslations } from 'next-intl/server';
import { type Locale } from '@/i18n';
import { getBlogs } from '@/lib/api/content';
import BlogClientPage from './client-page';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface BlogPageProps {
  params: { locale: Locale };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = params;
  const blogs = await getBlogs(locale);

  return <BlogClientPage blogs={blogs} locale={locale} />;
}
