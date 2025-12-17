'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';
import { TourUpsellCard } from '@/components/upsells/tour-upsell-card';
import type { Tour, Locale } from '@/lib/data/types';

export default function OrderSuccessPage() {
  const t = useTranslations('orderSuccess');
  const params = useParams();
  const locale = params.locale as Locale;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [featuredTours, setFeaturedTours] = useState<Tour[]>([]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      // Retry logic - sometimes the order takes a moment to be created/updated by webhook
      let retries = 3;
      let delay = 1000;

      const attemptFetch = async (): Promise<void> => {
        try {
          // Use Supabase client which handles RLS properly
          const { data, error } = await supabase
            .from('stripe_orders')
            .select('*')
            .eq('checkout_session_id', sessionId)
            .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if not found

          if (error) {
            console.error('Error fetching order:', error);
            throw error;
          }

          if (data) {
            setOrder(data);
            setLoading(false);
            return;
          }

          // If no data and we have retries left, retry
          if (retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            return attemptFetch();
          }

          // No order found after all retries
          setLoading(false);
        } catch (error) {
          console.error('Error fetching order:', error);
          if (retries > 0) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            return attemptFetch();
          }
          setLoading(false);
        }
      };

      attemptFetch();
    };

    const fetchFeaturedTours = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const toursRes = await fetch(`${supabaseUrl}/rest/v1/tours_table_prod?limit=3&select=*`, {
          headers: {
            'apikey': supabaseAnonKey || '',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        });

        if (toursRes.ok) {
          const toursData = await toursRes.json();
          const mappedTours = toursData.map((row: any) => ({
            id: row.id,
            city: row.city?.toLowerCase() || '',
            slug: row.title.toLowerCase().replace(/\s+/g, '-'),
            title: row.title,
            type: row.type,
            durationMinutes: row.duration_minutes,
            price: row.price ? Number(row.price) : undefined,
            startLocation: row.start_location,
            endLocation: row.end_location,
            languages: row.languages || [],
            description: row.description,
            options: row.options,
          }));
          setFeaturedTours(mappedTours);
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      }
    };

    fetchOrder();
    fetchFeaturedTours();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!sessionId || !order) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{t('notFoundTitle')}</CardTitle>
            <CardDescription>
              {t('notFoundDescription')}
              {sessionId && (
                <span className="block mt-2 text-xs font-mono text-muted-foreground">
                  Session ID: {sessionId}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('orderMayBeProcessing') || 'Your order may still be processing. Please check your email for confirmation or contact support if you have questions.'}
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href={`/${locale}`}>{t('returnHome')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/account?tab=orders`}>{t('viewMyOrders') || 'View My Orders'}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('orderId')}</span>
              <span className="text-muted-foreground font-mono text-sm">{String(order.id).slice(0, 8)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('customerName')}</span>
              <span className="text-muted-foreground">{order.customer_name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('email')}</span>
              <span className="text-muted-foreground">{order.customer_email}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('status')}</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {order.status === 'paid' ? t('statusPaid') : t('statusProcessing')}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{t('orderItems')}</h3>
            <div className="space-y-2">
              {order.items?.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <div className="flex items-center gap-3">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{t('quantity')}: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-medium">€{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {order.shipping_address && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{t('shippingAddress')}</h3>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p>{order.shipping_address.street}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.postalCode}</p>
                <p>{order.shipping_address.country}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t-2">
            <span className="text-lg font-bold">{t('total')}</span>
            <span className="text-lg font-bold">€{order.total_amount.toFixed(2)}</span>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>{t('whatsNext')}</strong>
              <br />
              {t('nextSteps')}
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href={`/${locale}`}>{t('returnHome')}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/${locale}/webshop`}>{t('continueShopping')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {featuredTours.length > 0 && (
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--primary-base)' }} />
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
                Experience Belgium in Person
              </h2>
            </div>
            <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
              Love Belgian culture? Join one of our expertly guided tours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredTours.map((tour) => (
              <TourUpsellCard key={tour.id} tour={tour} locale={locale} />
            ))}
          </div>

          <div className="text-center mt-10">
            <Button asChild size="lg" style={{ backgroundColor: 'var(--primary-base)' }}>
              <Link href={`/${locale}/tours`}>
                View All Tours
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
