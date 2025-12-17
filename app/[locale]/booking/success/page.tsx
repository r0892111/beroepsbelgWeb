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
  const [isOpMaat, setIsOpMaat] = useState(false);

  // Load JotForm script and initialize embed handler
  useEffect(() => {
    if (isOpMaat && process.env.NEXT_PUBLIC_JOTFORM_ID) {
      // Load the JotForm embed handler script
      const script = document.createElement('script');
      script.src = 'https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js';
      script.async = true;
      script.type = 'text/javascript';
      
      script.onload = () => {
        // Initialize the embed handler after script loads
        if ((window as any).jotformEmbedHandler && process.env.NEXT_PUBLIC_JOTFORM_ID) {
          const iframeId = `JotFormIFrame-${process.env.NEXT_PUBLIC_JOTFORM_ID}`;
          (window as any).jotformEmbedHandler(`iframe[id='${iframeId}']`, 'https://form.jotform.com/');
        }
      };
      
      document.body.appendChild(script);

      return () => {
        // Cleanup script on unmount
        const existingScript = document.querySelector('script[src*="jotfor.ms"]');
        if (existingScript && existingScript.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
        }
      };
    }
  }, [isOpMaat]);

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
          
          if (bookingData && bookingData.length > 0) {
            const booking = bookingData[0];
            const invitee = booking.invitees?.[0];

            // Fetch the tour data separately
            let tourTitle = 'Tour';
            let opMaat = false;
            if (booking.tour_id) {
              const tourResponse = await fetch(
                `${supabaseUrl}/rest/v1/tours_table_prod?id=eq.${booking.tour_id}&select=title,op_maat`,
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
                  opMaat = tourData[0].op_maat === true || tourData[0].op_maat === 'true' || tourData[0].op_maat === 1;
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
            setIsOpMaat(opMaat);
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
      <Card className={`mx-auto ${isOpMaat ? 'max-w-5xl' : 'max-w-2xl'}`}>
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
              <span className="font-medium">{t('bookingReference')}</span>
              <span className="text-muted-foreground font-mono font-semibold">#{booking.id}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">{t('tour')}</span>
              <span className="text-muted-foreground">{booking.tour_title || t('tour')}</span>
            </div>
            {!isOpMaat && booking.booking_date && (
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
            )}
            {!isOpMaat && (
              <>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">{t('numberOfPeople')}</span>
                  <span className="text-muted-foreground">{booking.number_of_people}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-medium">{t('language')}</span>
                  <span className="text-muted-foreground uppercase">{booking.language}</span>
                </div>
              </>
            )}
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

          {isOpMaat ? (
            <div className="space-y-4">
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-lg">
                <p className="text-sm text-amber-900 font-semibold mb-2">
                  {t('opMaatRedirectTitle')}
                </p>
                <p className="text-sm text-amber-800">
                  {t('opMaatFormMessage')}
                </p>
              </div>
              {process.env.NEXT_PUBLIC_JOTFORM_ID && (
                <div className="w-full">
                  <iframe
                    id={`JotFormIFrame-${process.env.NEXT_PUBLIC_JOTFORM_ID}`}
                    title="Op Maat"
                    onLoad={() => window.parent.scrollTo(0, 0)}
                    allowTransparency={true}
                    allow="geolocation; microphone; camera; fullscreen; payment"
                    src={`https://form.jotform.com/${process.env.NEXT_PUBLIC_JOTFORM_ID}?typEen=${encodeURIComponent(booking.id || '')}&q20_boekingsOf[first]=${encodeURIComponent(booking.id || '')}&q20_boekingsOf=${encodeURIComponent(booking.id || '')}&customerName=${encodeURIComponent(booking.customer_name || '')}&customerEmail=${encodeURIComponent(booking.customer_email || '')}&customerPhone=${encodeURIComponent(booking.customer_phone || '')}&tourTitle=${encodeURIComponent(booking.tour_title || '')}&bookingId=${encodeURIComponent(booking.id || '')}&sessionId=${encodeURIComponent(sessionId || '')}`}
                    frameBorder="0"
                    style={{
                      minWidth: '100%',
                      maxWidth: '100%',
                      height: '539px',
                      border: 'none',
                    }}
                    scrolling="no"
                    className="w-full"
                  />
                </div>
              )}
              {!process.env.NEXT_PUBLIC_JOTFORM_ID && (
                <div className="bg-red-50 border-2 border-red-200 p-4 rounded-lg">
                  <p className="text-sm text-red-900">
                    JotForm ID is not configured. Please set NEXT_PUBLIC_JOTFORM_ID in your environment variables.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{t('whatsNext')}</strong>
                <br />
                {t('nextSteps')}
              </p>
            </div>
          )}

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

