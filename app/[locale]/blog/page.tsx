import AngledSection from '@/components/design-system/AngledSection';
import { type Locale } from '@/i18n';
import { getBlogPosts } from '@/lib/api/content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

interface BlogPageProps {
  params: { locale: Locale };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = params;
  const blogPosts = await getBlogPosts();
  return (
    <AngledSection plane="right">
      <h1 className="mb-12 text-center text-4xl font-bold">Blog</h1>
      <div className="mx-auto max-w-4xl space-y-8">
        {blogPosts.map((post) => (
          <Card key={post.slug} className="transition-all hover:shadow-lg">
            <CardHeader>
              <div className="mb-2 flex items-center justify-between">
                <CardTitle className="text-2xl">{post.title[locale]}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(post.date), 'dd/MM/yyyy')}
                </span>
              </div>
              <CardDescription className="text-base">{post.excerpt[locale]}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/${locale}/blog/${post.slug}`}>Lees meer</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AngledSection>
  );
}
