'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Blog } from '@/lib/data/types';
import type { Locale } from '@/i18n';

interface BlogClientPageProps {
  blogs: Blog[];
  locale: Locale;
}

// Helper to get localized content
const getLocalizedContent = (blog: Blog, locale: Locale) => {
  let title = blog.title;
  let excerpt = blog.excerpt || '';
  let content = blog.content;

  if (locale === 'en' && blog.title_en) {
    title = blog.title_en;
    excerpt = blog.excerpt_en || excerpt;
    content = blog.content_en || content;
  } else if (locale === 'fr' && blog.title_fr) {
    title = blog.title_fr;
    excerpt = blog.excerpt_fr || excerpt;
    content = blog.content_fr || content;
  } else if (locale === 'de' && blog.title_de) {
    title = blog.title_de;
    excerpt = blog.excerpt_de || excerpt;
    content = blog.content_de || content;
  }

  return { title, excerpt, content };
};

export default function BlogClientPage({ blogs, locale }: BlogClientPageProps) {
  const t = useTranslations('blog');

  // Separate featured and regular blogs
  const featuredBlogs = blogs.filter((blog) => blog.featured);
  const regularBlogs = blogs.filter((blog) => !blog.featured);

  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-navy mb-4">{t('title')}</h1>
        </div>

        {blogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t('noPosts')}</p>
          </div>
        ) : (
          <>
            {/* Featured Blogs */}
            {featuredBlogs.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">Featured</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {featuredBlogs.map((blog) => {
                    const { title, excerpt } = getLocalizedContent(blog, locale);
                    return (
                      <Card key={blog.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {blog.thumbnail_url && (
                          <div className="relative w-full h-48">
                            <Image
                              src={blog.thumbnail_url}
                              alt={title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                            {blog.category && (
                              <Badge variant="outline">{blog.category}</Badge>
                            )}
                            {blog.featured && (
                              <Badge variant="default" className="bg-yellow-500">Featured</Badge>
                            )}
                          </div>
                          <CardTitle className="line-clamp-2">{title}</CardTitle>
                          {blog.published_at && (
                            <CardDescription>
                              {t('publishedOn')} {format(new Date(blog.published_at), 'PPP')}
                            </CardDescription>
                          )}
                        </CardHeader>
                        {excerpt && (
                          <CardContent>
                            <p className="text-gray-600 line-clamp-3">{excerpt}</p>
                          </CardContent>
                        )}
                        <CardFooter>
                          <Link href={`/${locale}/blog/${blog.slug}`} className="w-full">
                            <Button className="w-full">{t('readMore')}</Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular Blogs */}
            {regularBlogs.length > 0 && (
              <div>
                {featuredBlogs.length > 0 && (
                  <h2 className="text-2xl font-serif font-bold text-navy mb-6">All Posts</h2>
                )}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {regularBlogs.map((blog) => {
                    const { title, excerpt } = getLocalizedContent(blog, locale);
                    return (
                      <Card key={blog.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {blog.thumbnail_url && (
                          <div className="relative w-full h-48">
                            <Image
                              src={blog.thumbnail_url}
                              alt={title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-center gap-2 mb-2">
                            {blog.category && (
                              <Badge variant="outline">{blog.category}</Badge>
                            )}
                          </div>
                          <CardTitle className="line-clamp-2">{title}</CardTitle>
                          {blog.published_at && (
                            <CardDescription>
                              {t('publishedOn')} {format(new Date(blog.published_at), 'PPP')}
                            </CardDescription>
                          )}
                          {blog.author && (
                            <CardDescription>
                              {t('author')}: {blog.author}
                            </CardDescription>
                          )}
                        </CardHeader>
                        {excerpt && (
                          <CardContent>
                            <p className="text-gray-600 line-clamp-3">{excerpt}</p>
                          </CardContent>
                        )}
                        <CardFooter>
                          <Link href={`/${locale}/blog/${blog.slug}`} className="w-full">
                            <Button className="w-full">{t('readMore')}</Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

