'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { TourUpsellCard } from '@/components/upsells/tour-upsell-card';
import { ProductUpsellCard } from '@/components/upsells/product-upsell-card';
import type { Tour, Product, Locale } from '@/lib/data/types';

export default function BookingSuccessPage() {
  const t = useTranslations('bookingSuccess');
  const params = useParams();
  const locale = params.locale as Locale;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [relatedTours, setRelatedTours] = useState<Tour[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // First, fetch the booking
        const bookingResponse = await fetch(
          `${supabaseUrl}/rest/v1/tourbooking?stripe_session_id=eq.${sessionId}&select=*`,
          {
            headers: {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (bookingResponse.ok) {
          const bookingData = await bookingResponse.json();
          console.log('Booking data:', bookingData);
          
          if (bookingData && bookingData.length > 0) {
            const booking = bookingData[0];
            const invitee = booking.invitees?.[0];

            // Fetch the tour data separately
            let tourTitle = 'Tour';
            if (booking.tour_id) {
              const tourResponse = await fetch(
                `${supabaseUrl}/rest/v1/tours_table_prod?id=eq.${booking.tour_id}&select=title`,
                {
                  headers: {
                    'apikey': supabaseAnonKey || '',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                  },
                }
              );
              
              if (tourResponse.ok) {
                const tourData = await tourResponse.json();
                if (tourData && tourData.length > 0) {
                  tourTitle = tourData[0].title;
                }
              }
            }

            setBooking({
              ...booking,
              tour_title: tourTitle,
              customer_name: invitee?.name,
              customer_email: invitee?.email,
              customer_phone: invitee?.phone,
              number_of_people: invitee?.numberOfPeople,
              language: invitee?.language,
              special_requests: invitee?.specialRequests,
              amount: invitee?.amount,
              booking_date: booking.tour_datetime,
            });
          }
        } else {
          console.error('Failed to fetch booking:', await bookingResponse.text());
        }
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUpsells = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const [toursRes, productsRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/tours_table_prod?limit=3&select=*`, {
            headers: {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }),
          fetch(`${supabaseUrl}/rest/v1/products?limit=3&select=*`, {
            headers: {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }),
        ]);

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
          setRelatedTours(mappedTours);
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          const mappedProducts = productsData.map((row: any) => ({
            slug: row.slug,
            uuid: row.id,
            title: {
              nl: row.title_nl,
              en: row.title_en,
              fr: row.title_fr,
              de: row.title_de,
            },
            category: row.category as 'Book' | 'Merchandise' | 'Game',
            price: row.price,
            description: {
              nl: row.description_nl,
              en: row.description_en,
              fr: row.description_fr,
              de: row.description_de,
            },
            label: row.label,
          }));
          setFeaturedProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error fetching upsells:', error);
      }
    };

    fetchBooking();
    fetchUpsells();
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

  if (!sessionId || !booking) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{t('notFoundTitle')}</CardTitle>
            <CardDescription>{t('notFoundDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">{t('returnHome')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="max-w-2xl mx-auto">
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
              <span className="font-medium">{t('tour')}</span>
              <span className="text-muted-foreground">{booking.tour_title || t('tour')}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('date')}</span>
              <span className="text-muted-foreground">
                {new Date(booking.booking_date).toLocaleDateString('nl-BE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('numberOfPeople')}</span>
              <span className="text-muted-foreground">{booking.number_of_people}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('language')}</span>
              <span className="text-muted-foreground uppercase">{booking.language}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('customerName')}</span>
              <span className="text-muted-foreground">{booking.customer_name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('email')}</span>
              <span className="text-muted-foreground">{booking.customer_email}</span>
            </div>
            <div className="flex justify-between pt-4">
              <span className="text-lg font-bold">{t('totalPaid')}</span>
              <span className="text-lg font-bold">€{booking.amount.toFixed(2)}</span>
            </div>
          </div>

          {booking.special_requests && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-1">{t('specialRequests')}</p>
              <p className="text-sm text-muted-foreground">{booking.special_requests}</p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>{t('whatsNext')}</strong>
              <br />
              {t('nextSteps')}
            </p>
          </div>

          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/">{t('returnHome')}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/tours">{t('browseTours')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {(relatedTours.length > 0 || featuredProducts.length > 0) && (
        <div className="mt-16 max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" style={{ color: 'var(--primary-base)' }} />
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
                Discover More
              </h2>
            </div>
            <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
              Continue your journey with more tours and exclusive items
            </p>
          </div>

          {relatedTours.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
                More Tours You'll Love
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedTours.map((tour) => (
                  <TourUpsellCard key={tour.id} tour={tour} locale={locale} />
                ))}
              </div>
            </div>
          )}

          {featuredProducts.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
                Take Home a Memory
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {featuredProducts.map((product) => (
                  <ProductUpsellCard key={product.uuid} product={product} locale={locale} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
