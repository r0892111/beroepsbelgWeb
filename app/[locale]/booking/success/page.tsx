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
  const [purchasedUpsellProducts, setPurchasedUpsellProducts] = useState<Product[]>([]);
  const [isOpMaat, setIsOpMaat] = useState(false);
  const [jotFormUrl, setJotFormUrl] = useState<string>('');

  // Note: JotForm embed handler removed to avoid CORS issues
  // URL parameters are sufficient for pre-filling form fields
  // The embed handler is optional and mainly used for responsive sizing and form submission handling

  useEffect(() => {
    const fetchUpsellProductDetails = async (upsellProducts: any[]) => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // Get product UUIDs from upsell products
        const productIds = upsellProducts.map((p: any) => p.id).filter(Boolean);
        
        if (productIds.length === 0) {
          return;
        }

        // Fetch product details from webshop_data table
        const productsRes = await fetch(
          `${supabaseUrl}/rest/v1/webshop_data?uuid=in.(${productIds.join(',')})&select=*`,
          {
            headers: {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          
          // Map products and include quantity from upsell
          const mappedProducts = productsData.map((row: any) => {
            const upsellProduct = upsellProducts.find((p: any) => p.id === row.uuid);
            return {
              slug: row.Name ? row.Name.toLowerCase().replace(/\s+/g, '-') : row.uuid,
              uuid: row.uuid,
              title: {
                nl: row.Name || '',
                en: row.Name || '',
                fr: row.Name || '',
                de: row.Name || '',
              },
              category: (row.Category === 'Book' || row.Category === 'Merchandise' || row.Category === 'Game') 
                ? row.Category as 'Book' | 'Merchandise' | 'Game'
                : 'Book' as const,
              price: parseFloat(row['Price (EUR)'] || '0'),
              description: {
                nl: row.Description || '',
                en: row.Description || '',
                fr: row.Description || '',
                de: row.Description || '',
              },
              quantity: upsellProduct?.quantity || 1,
            };
          });
          
          setPurchasedUpsellProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error fetching upsell product details:', error);
      }
    };

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
          const bookingResponseData = await bookingResponse.json();
          console.log('Booking data:', bookingResponseData);
          
          if (bookingResponseData && bookingResponseData.length > 0) {
            const booking = bookingResponseData[0];
            const invitee = booking.invitees?.[0];

            // Fetch the tour data separately
            let tourTitle = 'Tour';
            let tourOpMaat = false;
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
                  // Check op_maat property (can be boolean, string, or number)
                  tourOpMaat = tourData[0].op_maat === true || 
                               tourData[0].op_maat === 'true' || 
                               tourData[0].op_maat === 1;
                }
              }
            }

            // Get upsell products from invitee
            const upsellProducts = invitee?.upsellProducts || [];
            
            // Use tour's op_maat property directly (most reliable)
            const opMaatValue = tourOpMaat;
            
            const bookingData = {
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
              upsell_products: upsellProducts,
            };
            
            console.log('Setting booking data for JotForm pre-fill:', {
              bookingId: booking.id,
              opMaat: opMaatValue,
              customer_name: bookingData.customer_name,
              customer_email: bookingData.customer_email,
              customer_phone: bookingData.customer_phone,
              inviteeData: invitee,
            });
            
            setBooking(bookingData);
            setIsOpMaat(opMaatValue);
            
            // Build JotForm URL with pre-filled data if it's an op maat tour
            // JotForm uses unique field names, not IDs. These should match the unique names in your JotForm.
            // To find unique names: In JotForm builder > Select field > Gear icon > Advanced tab > Field Details > Unique Name
            if (opMaatValue && process.env.NEXT_PUBLIC_JOTFORM_ID) {
              const baseUrl = `https://form.jotform.com/${process.env.NEXT_PUBLIC_JOTFORM_ID}`;
              const params = new URLSearchParams();
              
              // Field unique names - these must match the "Unique Name" from JotForm Advanced tab
              // You can override these via environment variables if needed
              const FIELD_BOOKING_NUMBER = process.env.NEXT_PUBLIC_JOTFORM_FIELD_BOOKING_NUMBER || 'typEen';
              const FIELD_EMAIL = process.env.NEXT_PUBLIC_JOTFORM_FIELD_EMAIL || 'email11';
              const FIELD_TOUR_DATE = process.env.NEXT_PUBLIC_JOTFORM_FIELD_TOUR_DATE || 'datum'; // Updated based on JotForm unique name
              
              console.log('=== JOTFORM PRE-FILL DEBUG START ===');
              console.log('Field mappings:', {
                bookingNumber: FIELD_BOOKING_NUMBER,
                email: FIELD_EMAIL,
                tourDate: FIELD_TOUR_DATE,
              });
              
              console.log('Booking data available:', {
                bookingId: booking.id,
                customer_email: bookingData.customer_email,
                booking_date: bookingData.booking_date,
                tour_datetime: booking.tour_datetime,
              });
              
              // Pre-fill booking number
              if (booking.id) {
                const bookingId = booking.id.toString();
                params.append(FIELD_BOOKING_NUMBER, bookingId);
                console.log(`✓ Added booking number: ${FIELD_BOOKING_NUMBER} = "${bookingId}"`);
              } else {
                console.log('✗ No booking ID available');
              }
              
              // Pre-fill email
              if (bookingData.customer_email) {
                params.append(FIELD_EMAIL, bookingData.customer_email);
                console.log(`✓ Added email: ${FIELD_EMAIL} = "${bookingData.customer_email}"`);
              } else {
                console.log('✗ No customer email available');
              }
              
              // Pre-fill tour date
              const tourDateValue = bookingData.booking_date || booking.tour_datetime;
              console.log('Tour date check:', {
                booking_date: bookingData.booking_date,
                tour_datetime: booking.tour_datetime,
                tourDateValue,
                type: typeof tourDateValue,
              });
              
              if (tourDateValue) {
                const dateObj = new Date(tourDateValue);
                const isValidDate = !isNaN(dateObj.getTime()) && dateObj.getTime() !== 0;
                
                console.log('Date validation:', {
                  dateObj: dateObj.toISOString(),
                  isValidDate,
                  timestamp: dateObj.getTime(),
                });
                
                if (isValidDate) {
                  // Format date as MM-DD-YYYY for JotForm
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const year = dateObj.getFullYear();
                  const formattedDate = `${month}-${day}-${year}`;
                  
                  params.append(FIELD_TOUR_DATE, formattedDate);
                  console.log(`✓ Added tour date: ${FIELD_TOUR_DATE} = "${formattedDate}"`);
                  console.log('Date processing:', {
                    original: tourDateValue,
                    formatted: formattedDate,
                    format: 'MM-DD-YYYY',
                    dateObj: dateObj.toISOString(),
                  });
                } else {
                  console.log('✗ Invalid tour date:', {
                    value: tourDateValue,
                    parsed: dateObj.toISOString(),
                    timestamp: dateObj.getTime(),
                  });
                }
              } else {
                console.log('✗ No tour date available:', {
                  booking_date: bookingData.booking_date,
                  tour_datetime: booking.tour_datetime,
                });
              }
              
              const queryString = params.toString();
              const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
              
              console.log('=== FINAL JOTFORM URL ===');
              console.log('Base URL:', baseUrl);
              console.log('Query String:', queryString);
              console.log('Full URL:', finalUrl);
              console.log('All Parameters:', Object.fromEntries(params));
              console.log('Parameter count:', params.toString().split('&').length);
              console.log('=== JOTFORM PRE-FILL DEBUG END ===');
              
              setJotFormUrl(finalUrl);
            } else {
              console.log('Not building JotForm URL:', {
                isOpMaat: opMaatValue,
                hasFormId: !!process.env.NEXT_PUBLIC_JOTFORM_ID,
              });
            }
            
            // Fetch upsell product details if there are any
            if (upsellProducts && upsellProducts.length > 0) {
              console.log('Fetching upsell product details for:', upsellProducts.length, 'products');
              await fetchUpsellProductDetails(upsellProducts);
            } else {
              console.log('No upsell products found in booking');
            }
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
                {(() => {
                  // Use booking_date if available, otherwise fall back to tour_datetime
                  const dateValue = booking.booking_date || booking.tour_datetime;
                  
                  if (!dateValue) {
                    return isOpMaat ? t('dateToBeDetermined') || 'Datum wordt bepaald' : t('noDate') || 'Geen datum';
                  }
                  
                  const dateObj = new Date(dateValue);
                  
                  // Check if date is valid (not NaN and not epoch date)
                  if (isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
                    return isOpMaat ? t('dateToBeDetermined') || 'Datum wordt bepaald' : t('noDate') || 'Geen datum';
                  }
                  
                  return dateObj.toLocaleDateString('nl-BE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                })()}
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
            {purchasedUpsellProducts.length > 0 && (
              <div className="pt-4 border-t">
                <p className="font-medium mb-3 text-base">{t('purchasedProducts') || 'Gekochte producten'}:</p>
                <div className="space-y-2">
                  {purchasedUpsellProducts.map((product: any, index) => {
                    const quantity = product.quantity || 1;
                    const totalPrice = product.price * quantity;
                    return (
                      <div key={product.uuid || index} className="flex justify-between items-center py-1">
                        <span className="text-sm text-muted-foreground">
                          {product.title[locale]} {quantity > 1 && <span className="text-xs">(x{quantity})</span>}
                        </span>
                        <span className="font-medium text-sm">
                          €{totalPrice.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-between pt-4 border-t">
              <span className="text-lg font-bold">{t('totalPaid')}</span>
              <span className="text-lg font-bold">
                €{(() => {
                  // Calculate total: tour amount + upsell products total
                  const tourAmount = parseFloat(booking.amount) || 0;
                  const upsellTotal = purchasedUpsellProducts.reduce((sum, product: any) => {
                    const quantity = product.quantity || 1;
                    const price = parseFloat(String(product.price)) || 0;
                    return sum + (price * quantity);
                  }, 0);
                  const totalAmount = tourAmount + upsellTotal;
                  return totalAmount.toFixed(2);
                })()}
              </span>
            </div>
          </div>

          {booking.special_requests && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium mb-1">{t('specialRequests')}</p>
              <p className="text-sm text-muted-foreground">{booking.special_requests}</p>
            </div>
          )}

          {isOpMaat && process.env.NEXT_PUBLIC_JOTFORM_ID && (
            <div className="rounded-lg border-2 p-6" style={{ borderColor: 'var(--brass)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                {t('opMaatFormTitle') || 'Vul het formulier in'}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                {t('opMaatFormDescription') || 'Help ons je perfecte tour samen te stellen door het onderstaande formulier in te vullen.'}
              </p>
              <div className="w-full" id={`jotform-container-${process.env.NEXT_PUBLIC_JOTFORM_ID}`}>
                {jotFormUrl ? (
                  <iframe
                    id={`JotFormIFrame-${process.env.NEXT_PUBLIC_JOTFORM_ID}`}
                    title="JotForm"
                    src={jotFormUrl}
                    frameBorder="0"
                    style={{
                      width: '100%',
                      minHeight: '500px',
                      border: 'none',
                    }}
                    allow="geolocation; microphone; camera"
                    key={jotFormUrl} // Force re-render when URL changes
                    onLoad={() => {
                      console.log('JotForm iframe loaded');
                      console.log('Full URL:', jotFormUrl);
                      console.log('URL parameters:', jotFormUrl.split('?')[1] || 'none');
                      // Log each parameter separately for debugging
                      const params = new URL(jotFormUrl).searchParams;
                      console.log('Parsed parameters:', Object.fromEntries(params));
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Formulier laden...</span>
                  </div>
                )}
              </div>
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
