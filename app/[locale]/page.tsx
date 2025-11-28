import { type Locale } from '@/i18n';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Briefcase, Users, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';

interface HomePageProps {
  params: Promise<{ locale: Locale }>;
}

async function getFeaturedProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_featured', true)
    .limit(3);

  if (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }

  return data || [];
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations('homepage');
  const featuredProducts = await getFeaturedProducts();

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-navy via-navy/95 to-brown py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h1 className="font-serif text-4xl md:text-6xl font-bold mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-lg md:text-xl text-sand/90 mb-8">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-sand">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-brown">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-brown/10 flex items-center justify-center group-hover:bg-brown/20 transition-colors">
                  <Briefcase className="h-8 w-8 text-brown" />
                </div>
                <CardTitle className="text-2xl font-serif text-navy">{t('sections.b2b.title')}</CardTitle>
                <CardDescription className="text-base">{t('sections.b2b.description')}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-brown mt-1">•</span>
                    <span>{t('sections.b2b.feature1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brown mt-1">•</span>
                    <span>{t('sections.b2b.feature2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brown mt-1">•</span>
                    <span>{t('sections.b2b.feature3')}</span>
                  </li>
                </ul>
                <Link href={`/${locale}/b2b-offerte`}>
                  <Button className="w-full bg-brown hover:bg-brown/90 text-white group-hover:gap-3 transition-all">
                    {t('sections.b2b.cta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-navy">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-navy/10 flex items-center justify-center group-hover:bg-navy/20 transition-colors">
                  <Users className="h-8 w-8 text-navy" />
                </div>
                <CardTitle className="text-2xl font-serif text-navy">{t('sections.tours.title')}</CardTitle>
                <CardDescription className="text-base">{t('sections.tours.description')}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-navy mt-1">•</span>
                    <span>{t('sections.tours.feature1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-navy mt-1">•</span>
                    <span>{t('sections.tours.feature2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-navy mt-1">•</span>
                    <span>{t('sections.tours.feature3')}</span>
                  </li>
                </ul>
                <Link href={`/${locale}/tours`}>
                  <Button className="w-full bg-navy hover:bg-navy/90 text-white group-hover:gap-3 transition-all">
                    {t('sections.tours.cta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-brown">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <ShoppingBag className="h-8 w-8 text-amber-700" />
                </div>
                <CardTitle className="text-2xl font-serif text-navy">{t('sections.webshop.title')}</CardTitle>
                <CardDescription className="text-base">{t('sections.webshop.description')}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6 text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 mt-1">•</span>
                    <span>{t('sections.webshop.feature1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 mt-1">•</span>
                    <span>{t('sections.webshop.feature2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-700 mt-1">•</span>
                    <span>{t('sections.webshop.feature3')}</span>
                  </li>
                </ul>
                <Link href={`/${locale}/webshop`}>
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white group-hover:gap-3 transition-all">
                    {t('sections.webshop.cta')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-amber-600" />
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy">
                  {t('spotlight.title')}
                </h2>
                <Sparkles className="h-6 w-6 text-amber-600" />
              </div>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('spotlight.subtitle')}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
              {featuredProducts.map((product: any) => (
                <Card key={product.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="aspect-square overflow-hidden bg-sand/30">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-20 w-20 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl font-serif text-navy line-clamp-2">
                      {product.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {product.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-brown">
                        €{product.price.toFixed(2)}
                      </span>
                      {product.stock > 0 ? (
                        <span className="text-sm text-green-600 font-medium">
                          {t('spotlight.inStock')}
                        </span>
                      ) : (
                        <span className="text-sm text-red-600 font-medium">
                          {t('spotlight.outOfStock')}
                        </span>
                      )}
                    </div>
                    <Link href={`/${locale}/webshop`}>
                      <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                        {t('spotlight.viewProduct')}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href={`/${locale}/webshop`}>
                <Button variant="outline" size="lg" className="group">
                  {t('spotlight.viewAll')}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-sand">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy mb-4">
            {t('about.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            {t('about.description')}
          </p>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto mt-12">
            <div>
              <div className="text-4xl font-bold text-brown mb-2">10+</div>
              <div className="text-sm text-muted-foreground">{t('about.stat1')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-brown mb-2">50+</div>
              <div className="text-sm text-muted-foreground">{t('about.stat2')}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-brown mb-2">5000+</div>
              <div className="text-sm text-muted-foreground">{t('about.stat3')}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
