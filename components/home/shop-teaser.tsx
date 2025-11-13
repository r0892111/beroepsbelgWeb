import Link from 'next/link';
import { type Locale } from '@/i18n';
import { products } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface ShopTeaserProps {
  locale: Locale;
}

export function ShopTeaser({ locale }: ShopTeaserProps) {
  const t = useTranslations('common');
  const featuredProducts = products.slice(0, 3);

  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex items-center justify-between">
          <h2 className="text-3xl font-bold">Webshop</h2>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/webshop`}>Bekijk alles</Link>
          </Button>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <Card key={product.slug} className="transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <CardTitle className="text-lg">{product.title[locale]}</CardTitle>
                  {product.label && <Badge variant="secondary">{product.label}</Badge>}
                </div>
              </CardHeader>
              <CardFooter className="flex items-center justify-between">
                <span className="text-xl font-bold">€{product.price.toFixed(2)}</span>
                <Button size="sm">{t('order')}</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
