'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Loader2, Sparkles, Calendar, Users, Globe, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { TourUpsellCard } from '@/components/upsells/tour-upsell-card';
import { ProductUpsellCard } from '@/components/upsells/product-upsell-card';
import type { Tour, Product, Locale, TourImage } from '@/lib/data/types';

export default function BookingSuccessPage() {
  const t = useTranslations('bookingSuccess');
  const params = useParams();
  const locale = params.locale as Locale;
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [relatedTours, setRelatedTours] = useState<Tour[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [purchasedUpsellProducts, setPurchasedUpsellProducts] = useState<Product[]>([]);
  const [isOpMaat, setIsOpMaat] = useState(false);
  const [jotFormUrl, setJotFormUrl] = useState<string>('');
  const [tourImage, setTourImage] = useState<string | null>(null);
  const [tourMediaType, setTourMediaType] = useState<'image' | 'video'>('image');

  // Note: JotForm embed handler removed to avoid CORS issues
  // URL parameters are sufficient for pre-filling form fields
  // The embed handler is optional and mainly used for responsive sizing and form submission handling

  useEffect(() => {
    const fetchUpsellProductDetails = async (upsellProducts: any[]) => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // Get product UUIDs from upsell products
        // Support both standardized format {id, n, p, q} and legacy format {id, title, quantity, price}
        const productIds = upsellProducts
          .map((p: any) => p.id)
          .filter(Boolean);
        
        if (productIds.length === 0) {
          console.log('No product IDs found in upsell products');
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
          // Support both standardized format {id, n, p, q} and legacy format {id, title, quantity, price}
          const mappedProducts = productsData.map((row: any) => {
            const upsellProduct = upsellProducts.find((p: any) => p.id === row.uuid);
            // Get quantity from standardized format (q) or legacy format (quantity)
            const quantity = upsellProduct?.q !== undefined 
              ? upsellProduct.q 
              : (upsellProduct?.quantity || 1);
            
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
              quantity: quantity,
            };
          });
          
          setPurchasedUpsellProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Error fetching upsell product details:', error);
      }
    };

    const fetchBooking = async (retryCount = 0): Promise<boolean> => {
      if (!sessionId) {
        setLoading(false);
        return false;
      }

      const MAX_RETRIES = 15; // Max 30 seconds (15 * 2 seconds)
      const RETRY_DELAY = 2000; // 2 seconds

      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // First, check if this is a local stories booking by querying local_tours_bookings directly
        const localBookingResponse = await fetch(
          `${supabaseUrl}/rest/v1/local_tours_bookings?stripe_session_id=eq.${sessionId}&select=*`,
          {
            headers: {
              'apikey': supabaseAnonKey || '',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        let localBookingData: any = null;
        let booking: any = null;
        let invitee: any = null;
        let tourTitle = 'Tour';
        let tourOpMaat = false;
        let tourLocalStories = false;

        if (localBookingResponse.ok) {
          const localBookingResponseData = await localBookingResponse.json();
          console.log('Local booking data:', localBookingResponseData);
          
          if (localBookingResponseData && localBookingResponseData.length > 0) {
            // Found a local stories booking - use the first one (or match by email if we have it)
            localBookingData = localBookingResponseData[0];
            tourLocalStories = true;
            
            console.log('Found local stories booking:', {
              localBookingId: localBookingData.id,
              tourId: localBookingData.tour_id,
              customerEmail: localBookingData.customer_email,
              stripeSessionId: localBookingData.stripe_session_id,
            });

            // Fetch tour data including image
            if (localBookingData.tour_id) {
              const tourResponse = await fetch(
                `${supabaseUrl}/rest/v1/tours_table_prod?id=eq.${localBookingData.tour_id}&select=title,op_maat,local_stories,tour_images`,
                {
                  headers: {
                    'apikey': supabaseAnonKey || '',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                  },
                }
              );

              if (tourResponse.ok) {
                const tourData = await tourResponse.json();
                console.log('Local stories - Tour data from tours_table_prod:', tourData);
                if (tourData && tourData.length > 0) {
                  tourTitle = tourData[0].title;
                  tourOpMaat = tourData[0].op_maat === true ||
                               tourData[0].op_maat === 'true' ||
                               tourData[0].op_maat === 1;

                  // Get primary image/video from tour_images
                  const tourImages = tourData[0].tour_images;
                  console.log('Local stories - Tour images array:', tourImages);
                  if (tourImages && Array.isArray(tourImages) && tourImages.length > 0) {
                    // Sort: is_primary=true first, then by sort_order
                    const sortedImages = [...tourImages].sort((a: any, b: any) => {
                      if (a.is_primary === true && b.is_primary !== true) return -1;
                      if (a.is_primary !== true && b.is_primary === true) return 1;
                      return (a.sort_order || 0) - (b.sort_order || 0);
                    });
                    const primaryMedia = sortedImages[0];
                    console.log('Local stories - Selected primary media:', primaryMedia);
                    if (primaryMedia && primaryMedia.url) {
                      setTourImage(primaryMedia.url);
                      setTourMediaType(primaryMedia.media_type === 'video' ? 'video' : 'image');
                      console.log('Local stories - Set image to:', primaryMedia.url, 'type:', primaryMedia.media_type);
                    }
                  } else {
                    console.log('Local stories - No tour_images found for tour');
                  }
                }
              }
            }

            // For local stories, fetch payment data directly from Stripe (most reliable)
            // This avoids complex invitee matching that can return wrong data
            let stripeSessionData: any = null;
            try {
              const stripeResponse = await fetch(`/api/checkout-session/${sessionId}`);
              if (stripeResponse.ok) {
                stripeSessionData = await stripeResponse.json();
                console.log('Stripe session data for local stories:', stripeSessionData);
              }
            } catch (stripeError) {
              console.error('Error fetching Stripe session:', stripeError);
            }

            // Store stripe data in invitee-like structure for compatibility
            if (stripeSessionData?.success) {
              // Calculate tour base price (from tour line item, before discount)
              const tourItemPrice = stripeSessionData.tourItem?.totalPrice || 0;
              // Calculate upsells total
              const upsellsTotal = (stripeSessionData.upsellItems || []).reduce(
                (sum: number, item: any) => sum + (item.totalPrice || 0), 0
              );

              invitee = {
                name: localBookingData.customer_name,
                email: localBookingData.customer_email,
                phone: localBookingData.customer_phone,
                numberOfPeople: localBookingData.amnt_of_people,
                // Payment data from Stripe
                // amount = total paid (already after discount)
                amount: stripeSessionData.amountTotal,
                // originalAmount = tour price only (before discount, excluding upsells)
                originalAmount: tourItemPrice,
                promoCode: stripeSessionData.promoCode,
                promoDiscountAmount: stripeSessionData.discountAmount,
                promoDiscountPercent: stripeSessionData.promoDiscountPercent,
                // Upsell products from Stripe line items
                upsellProducts: stripeSessionData.upsellItems?.map((item: any) => ({
                  n: item.name,
                  p: item.unitPrice,
                  q: item.quantity,
                })) || [],
                language: stripeSessionData.language || 'nl',
                // No fees for local stories tours
                tanguyCost: 0,
                extraHourCost: 0,
                weekendFeeCost: 0,
                eveningFeeCost: 0,
              };
              console.log('Built invitee from Stripe data:', invitee);
            }
          }
        }

        // If not a local stories booking, fetch from tourbooking as normal
        if (!localBookingData) {
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
            console.log('Regular booking data:', bookingResponseData);

            if (bookingResponseData && bookingResponseData.length > 0) {
              booking = bookingResponseData[0];
              invitee = booking.invitees?.[0];

              // Fetch the tour data to get images
              if (booking.tour_id) {
                console.log('Fetching tour data for tour_id:', booking.tour_id);
                const tourResponse = await fetch(
                  `${supabaseUrl}/rest/v1/tours_table_prod?id=eq.${booking.tour_id}&select=title,op_maat,local_stories,tour_images`,
                  {
                    headers: {
                      'apikey': supabaseAnonKey || '',
                      'Authorization': `Bearer ${supabaseAnonKey}`,
                    },
                  }
                );

                if (tourResponse.ok) {
                  const tourData = await tourResponse.json();
                  console.log('Tour data from tours_table_prod:', tourData);
                  if (tourData && tourData.length > 0) {
                    tourTitle = tourData[0].title;
                    tourOpMaat = tourData[0].op_maat === true ||
                                 tourData[0].op_maat === 'true' ||
                                 tourData[0].op_maat === 1;

                    // Get primary image/video from tour_images
                    const tourImages = tourData[0].tour_images;
                    console.log('Tour images array:', tourImages);
                    if (tourImages && Array.isArray(tourImages) && tourImages.length > 0) {
                      // Sort: is_primary=true first, then by sort_order
                      const sortedImages = [...tourImages].sort((a: any, b: any) => {
                        if (a.is_primary === true && b.is_primary !== true) return -1;
                        if (a.is_primary !== true && b.is_primary === true) return 1;
                        return (a.sort_order || 0) - (b.sort_order || 0);
                      });
                      const primaryMedia = sortedImages[0];
                      console.log('Selected primary media:', primaryMedia);
                      if (primaryMedia && primaryMedia.url) {
                        setTourImage(primaryMedia.url);
                        setTourMediaType(primaryMedia.media_type === 'video' ? 'video' : 'image');
                        console.log('Set tour image to:', primaryMedia.url, 'type:', primaryMedia.media_type);
                      }
                    } else {
                      console.log('No tour_images found for tour');
                    }
                  }
                } else {
                  console.log('Tour fetch failed:', tourResponse.status, await tourResponse.text());
                }
              } else {
                console.log('No tour_id on booking');
              }
            }
          }
        }

        // Process booking data
        if (localBookingData || booking) {
          // Get upsell products from the matched invitee
          const upsellProducts = invitee?.upsellProducts || [];

          // Use tour's op_maat property directly (most reliable)
          const opMaatValue = tourOpMaat;
          
          // For local stories tours, use local_tours_bookings data
          let bookingData;
          if (localBookingData) {
            // Use local_tours_bookings data for local stories tours
            // Convert amnt_of_people (numeric) to number if needed
            const numberOfPeople = localBookingData.amnt_of_people
              ? (typeof localBookingData.amnt_of_people === 'string'
                  ? parseFloat(localBookingData.amnt_of_people)
                  : Number(localBookingData.amnt_of_people))
              : invitee?.numberOfPeople || 1;

            // Format booking_date properly (it's a date string from the database)
            const bookingDate = localBookingData.booking_date
              ? new Date(localBookingData.booking_date).toISOString()
              : (booking?.tour_datetime || null);

            bookingData = {
              id: booking?.id || localBookingData.booking_id || null,
              tour_id: localBookingData.tour_id,
              tour_title: tourTitle,
              customer_name: localBookingData.customer_name || '',
              customer_email: localBookingData.customer_email || '',
              customer_phone: localBookingData.customer_phone || '',
              number_of_people: numberOfPeople,
              language: invitee?.language || 'nl',
              special_requests: invitee?.specialRequests || '',
              // All amounts come from the matched invitee
              amount: invitee?.amount || 0,
              originalAmount: invitee?.originalAmount || 0,
              discountApplied: invitee?.discountApplied || 0,
              tanguyCost: invitee?.tanguyCost || 0,
              extraHourCost: invitee?.extraHourCost || 0,
              weekendFeeCost: invitee?.weekendFeeCost || 0,
              eveningFeeCost: invitee?.eveningFeeCost || 0,
              // Promo code discount from Stripe
              promoCode: invitee?.promoCode || null,
              promoDiscountAmount: invitee?.promoDiscountAmount || 0,
              promoDiscountPercent: invitee?.promoDiscountPercent || null,
              booking_date: bookingDate,
              booking_time: localBookingData.booking_time || '14:00:00',
              tour_datetime: bookingDate,
              upsell_products: upsellProducts,
              is_local_stories: true,
              // Include local booking ID for reference
              local_booking_id: localBookingData.id,
              status: booking?.status || 'payment_completed',
            };
            
            console.log('Local stories booking data prepared:', {
              customer_name: bookingData.customer_name,
              customer_email: bookingData.customer_email,
              number_of_people: bookingData.number_of_people,
              booking_date: bookingData.booking_date,
              booking_time: bookingData.booking_time,
              local_booking_id: bookingData.local_booking_id,
            });
          } else if (booking) {
            // Use tourbooking data for regular tours
            bookingData = {
              ...booking,
              tour_title: tourTitle,
              customer_name: invitee?.name || '',
              customer_email: invitee?.email || '',
              customer_phone: invitee?.phone || '',
              number_of_people: invitee?.numberOfPeople || 1,
              language: invitee?.language || 'nl',
              special_requests: invitee?.specialRequests || '',
              amount: invitee?.amount || 0,
              originalAmount: invitee?.originalAmount || 0,
              discountApplied: invitee?.discountApplied || 0,
              tanguyCost: invitee?.tanguyCost || 0,
              extraHourCost: invitee?.extraHourCost || 0,
              weekendFeeCost: invitee?.weekendFeeCost || 0,
              eveningFeeCost: invitee?.eveningFeeCost || 0,
              // Promo code discount from Stripe
              promoCode: invitee?.promoCode || null,
              promoDiscountAmount: invitee?.promoDiscountAmount || 0,
              promoDiscountPercent: invitee?.promoDiscountPercent || null,
              booking_date: booking.tour_datetime,
              upsell_products: upsellProducts,
              is_local_stories: false,
            };
          }

          console.log('Setting booking data for JotForm pre-fill:', {
            bookingId: bookingData.id,
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
              bookingId: bookingData.id,
              customer_email: bookingData.customer_email,
              booking_date: bookingData.booking_date,
              tour_datetime: bookingData.tour_datetime,
            });
            
            // Pre-fill booking number
            if (bookingData.id) {
              const bookingId = bookingData.id.toString();
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
            const tourDateValue = bookingData.booking_date || bookingData.tour_datetime;
            console.log('Tour date check:', {
              booking_date: bookingData.booking_date,
              tour_datetime: bookingData.tour_datetime,
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
                tour_datetime: bookingData.tour_datetime,
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
          
          // Handle upsell products
          if (localBookingData && invitee?.upsellProducts?.length > 0) {
            // For local stories with Stripe data, products are already in the right format
            // Convert from Stripe format {n, p, q} to display format
            const stripeUpsellProducts = invitee.upsellProducts.map((item: any) => ({
              uuid: `stripe-${Math.random().toString(36).substr(2, 9)}`,
              title: {
                nl: item.n || item.name || 'Product',
                en: item.n || item.name || 'Product',
                fr: item.n || item.name || 'Product',
                de: item.n || item.name || 'Product',
              },
              price: item.p || item.unitPrice || 0,
              quantity: item.q || item.quantity || 1,
            }));
            setPurchasedUpsellProducts(stripeUpsellProducts);
            console.log('Set upsell products from Stripe:', stripeUpsellProducts);
          } else if (upsellProducts && upsellProducts.length > 0) {
            // For regular bookings, fetch product details from database
            console.log('Fetching upsell product details for:', upsellProducts.length, 'products');
            await fetchUpsellProductDetails(upsellProducts);
          } else {
            console.log('No upsell products found in booking');
          }

          // Successfully found and loaded booking
          setProcessingPayment(false);
          setLoading(false);
          return true;
        } else {
          // No booking found - check if payment is still processing
          console.log('No booking found yet for session:', sessionId, { retryCount });

          // Check if there's a pending booking (payment still processing)
          const pendingResponse = await fetch(
            `${supabaseUrl}/rest/v1/pending_tour_bookings?stripe_session_id=eq.${sessionId}&select=*`,
            {
              headers: {
                'apikey': supabaseAnonKey || '',
                'Authorization': `Bearer ${supabaseAnonKey}`,
              },
            }
          );

          let hasPendingBooking = false;
          if (pendingResponse.ok) {
            const pendingData = await pendingResponse.json();
            hasPendingBooking = pendingData && pendingData.length > 0;
            if (hasPendingBooking) {
              console.log('Found pending booking, payment processing...', { retryCount });
            }
          }

          // Retry if we haven't exceeded max retries
          // Retry even if no pending booking found (webhook might have processed very fast)
          if (retryCount < MAX_RETRIES) {
            setProcessingPayment(true);
            console.log('Retrying to find booking...', { retryCount, hasPendingBooking });
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchBooking(retryCount + 1);
          }

          // Max retries reached
          if (hasPendingBooking) {
            console.error('Max retries reached, booking still processing');
          } else {
            console.error('No booking found for session after all retries:', sessionId);
          }
          setLoading(false);
          return false;
        }
      } catch (error) {
        console.error('Error fetching booking:', error);
        setLoading(false);
        return false;
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
          <p className="mt-4 text-muted-foreground">
            {processingPayment
              ? (t('processingPayment') || 'Je betaling wordt verwerkt...')
              : t('loading')
            }
          </p>
          {processingPayment && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('processingPaymentSubtext') || 'Dit duurt meestal slechts enkele seconden.'}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!sessionId || !booking) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8 text-center">
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>{t('notFoundTitle')}</h2>
            <p className="text-muted-foreground mb-6">{t('notFoundDescription')}</p>
            <Button asChild>
              <Link href="/">{t('returnHome')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('=== RENDER DEBUG ===');
  console.log('tourImage:', tourImage);
  console.log('tourMediaType:', tourMediaType);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Hero Section with Tour Image */}
      <div className="relative w-full h-[280px] md:h-[360px]">
        <div className="absolute inset-0 overflow-hidden">
          {tourImage ? (
            <>
              {tourMediaType === 'video' ? (
                <video
                  src={tourImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <Image
                  src={tourImage}
                  alt={booking.tour_title || 'Tour'}
                  fill
                  className="object-cover"
                  priority
                />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #1BDD95 0%, #17C683 50%, #14A86E 100%)' }}
            />
          )}
        </div>

        {/* Success badge at bottom edge of hero */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-4 translate-y-1/2 z-20">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(27, 221, 149, 0.9)', boxShadow: '0 0 30px rgba(27, 221, 149, 0.5)' }}
          >
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <div className="bg-white rounded-xl px-8 py-6 shadow-lg">
            <h1
              className="text-3xl md:text-4xl font-bold text-center text-black"
              style={{ fontFamily: 'Montserrat, sans-serif' }}
            >
              {t('title')}
            </h1>
            <p className="mt-2 text-lg text-neutral-700 text-center max-w-md">
              {t('description')}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-32 md:mt-40 relative z-10 pb-16">
        {/* Main Content Card */}
        <Card
          className="max-w-2xl mx-auto overflow-hidden"
          style={{ boxShadow: 'var(--shadow-large)' }}
        >
          <CardContent className="p-0">
            {/* Tour Title Banner */}
            <div
              className="px-6 py-5"
              style={{ backgroundColor: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)' }}
            >
              <h2
                className="text-xl md:text-2xl font-bold"
                style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--text-primary)' }}
              >
                {booking.tour_title || t('tour')}
              </h2>
            </div>

            {/* Booking Details Grid */}
            <div className="px-6 py-6 space-y-4">
              {/* Key info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('date')}</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {(() => {
                      const dateValue = booking.booking_date || booking.tour_datetime;
                      if (!dateValue) {
                        return isOpMaat ? t('dateToBeDetermined') || 'TBD' : t('noDate') || '-';
                      }
                      const dateObj = new Date(dateValue);
                      if (isNaN(dateObj.getTime()) || dateObj.getTime() === 0) {
                        return isOpMaat ? t('dateToBeDetermined') || 'TBD' : t('noDate') || '-';
                      }
                      return dateObj.toLocaleDateString(locale === 'en' ? 'en-GB' : 'nl-BE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                    })()}
                  </p>
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('numberOfPeople')}</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{booking.number_of_people}</p>
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('language')}</span>
                  </div>
                  <p className="font-semibold text-sm uppercase" style={{ color: 'var(--text-primary)' }}>{booking.language}</p>
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('customerName')}</span>
                  </div>
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{booking.customer_name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4" style={{ color: 'var(--primary-base)' }} />
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{t('email')}</span>
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{booking.customer_email}</p>
              </div>

              {/* Price breakdown section */}
              <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-light)' }}>
                <p className="font-semibold mb-3 text-base" style={{ color: 'var(--text-primary)' }}>{t('priceBreakdown') || 'Price Overview'}:</p>

                {(() => {
                  // Calculate all price components once
                  const promoDiscount = parseFloat(booking.promoDiscountAmount) || 0;
                  const tanguyCost = parseFloat(booking.tanguyCost) || 0;
                  const extraHourCost = parseFloat(booking.extraHourCost) || 0;
                  const weekendFeeCost = parseFloat(booking.weekendFeeCost) || 0;
                  const eveningFeeCost = parseFloat(booking.eveningFeeCost) || 0;
                  const totalFees = tanguyCost + extraHourCost + weekendFeeCost + eveningFeeCost;
                  
                  const upsellTotal = purchasedUpsellProducts.reduce((sum, product: any) => {
                    const quantity = product.quantity || 1;
                    const price = parseFloat(String(product.price)) || 0;
                    return sum + (price * quantity);
                  }, 0);
                  
                  // Calculate base tour price
                  let baseTourPrice = 0;
                  if (booking.originalAmount > 0) {
                    // Use originalAmount if available (tour price before discount, excluding fees)
                    baseTourPrice = parseFloat(booking.originalAmount);
                  } else {
                    // Reconstruct: amount is final total (after discount)
                    // Final amount = (tour + fees + upsells) - discount
                    // So: tour = finalAmount + discount - fees - upsells
                    const finalAmount = parseFloat(booking.amount) || 0;
                    baseTourPrice = Math.max(0, finalAmount + promoDiscount - totalFees - upsellTotal);
                  }
                  
                  const subtotal = baseTourPrice + totalFees + upsellTotal;
                  const finalTotal = subtotal - promoDiscount;
                  
                  return (
                    <>
                      {/* Tour base price */}
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                          {booking.tour_title} ({booking.number_of_people} {booking.number_of_people > 1 ? 'personen' : 'persoon'})
                        </span>
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          €{baseTourPrice.toFixed(2)}
                        </span>
                      </div>

                {/* Tanguy cost if applicable */}
                {booking.tanguyCost > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Tanguy</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>€{(parseFloat(booking.tanguyCost) || 0).toFixed(2)}</span>
                  </div>
                )}

                {/* Extra hour cost if applicable */}
                {booking.extraHourCost > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('extraHour') || 'Extra uur'}</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>€{(parseFloat(booking.extraHourCost) || 0).toFixed(2)}</span>
                  </div>
                )}

                {/* Weekend fee if applicable */}
                {booking.weekendFeeCost > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('weekendFee') || 'Weekendtoeslag'}</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>€{(parseFloat(booking.weekendFeeCost) || 0).toFixed(2)}</span>
                  </div>
                )}

                {/* Evening fee if applicable */}
                {booking.eveningFeeCost > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{t('eveningFee') || 'Avondtoeslag'}</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>€{(parseFloat(booking.eveningFeeCost) || 0).toFixed(2)}</span>
                  </div>
                )}

                {/* Upsell products */}
                {purchasedUpsellProducts.map((product: any, index) => {
                  const quantity = product.quantity || 1;
                  const totalPrice = product.price * quantity;
                  return (
                    <div key={product.uuid || index} className="flex justify-between items-center py-1">
                      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        {product.title[locale]} {quantity > 1 && <span className="text-xs">(x{quantity})</span>}
                      </span>
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        €{totalPrice.toFixed(2)}
                      </span>
                    </div>
                  );
                })}

                      {/* Subtotal (before discount) - only show if discount is applied */}
                      {promoDiscount > 0 && (
                        <div className="flex justify-between items-center py-1 pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {t('subtotal') || 'Subtotaal'}
                          </span>
                          <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                            €{subtotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* Promo code discount */}
                      {(promoDiscount > 0 || booking.promoCode) && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm" style={{ color: 'var(--primary-base)' }}>
                            {t('discount') || 'Korting'} {booking.promoCode && `(${booking.promoCode})`}
                            {booking.promoDiscountPercent && ` - ${booking.promoDiscountPercent}%`}
                          </span>
                          <span className="font-medium text-sm" style={{ color: 'var(--primary-base)' }}>
                            -€{promoDiscount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Total */}
              <div
                className="flex justify-between items-center pt-4 mt-2 border-t"
                style={{ borderColor: 'var(--border-light)' }}
              >
                <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('totalPaid')}</span>
                <span className="text-xl font-bold" style={{ color: 'var(--primary-base)' }}>
                  €{(() => {
                    // Calculate final total consistently
                    const promoDiscount = parseFloat(booking.promoDiscountAmount) || 0;
                    const tanguyCost = parseFloat(booking.tanguyCost) || 0;
                    const extraHourCost = parseFloat(booking.extraHourCost) || 0;
                    const weekendFeeCost = parseFloat(booking.weekendFeeCost) || 0;
                    const eveningFeeCost = parseFloat(booking.eveningFeeCost) || 0;
                    const totalFees = tanguyCost + extraHourCost + weekendFeeCost + eveningFeeCost;
                    
                    const upsellTotal = purchasedUpsellProducts.reduce((sum, product: any) => {
                      const quantity = product.quantity || 1;
                      const price = parseFloat(String(product.price)) || 0;
                      return sum + (price * quantity);
                    }, 0);
                    
                    let baseTourPrice = 0;
                    if (booking.originalAmount > 0) {
                      baseTourPrice = parseFloat(booking.originalAmount);
                    } else {
                      const finalAmount = parseFloat(booking.amount) || 0;
                      baseTourPrice = Math.max(0, finalAmount + promoDiscount - totalFees - upsellTotal);
                    }
                    
                    // Calculate expected total: tour + fees + upsells - discount
                    const calculatedTotal = baseTourPrice + totalFees + upsellTotal - promoDiscount;
                    const finalAmount = parseFloat(booking.amount) || 0;
                    
                    // Use the higher value to ensure we show the correct total
                    // booking.amount should be the source of truth, but if it's 0 or seems wrong, use calculated
                    if (booking.is_local_stories) {
                      return finalAmount.toFixed(2);
                    }
                    
                    return Math.max(finalAmount, calculatedTotal).toFixed(2);
                  })()}
                </span>
              </div>
            </div>

            {/* Special requests */}
            {booking.special_requests && (
              <div className="px-6 pb-4">
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-light)' }}>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('specialRequests')}</p>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{booking.special_requests}</p>
                </div>
              </div>
            )}

            {/* What's next section */}
            <div className="px-6 pb-6">
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: 'rgba(27, 221, 149, 0.1)', border: '1px solid rgba(27, 221, 149, 0.2)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  <strong style={{ color: 'var(--primary-dark)' }}>{t('whatsNext')}</strong>
                  <br />
                  <span style={{ color: 'var(--text-secondary)' }}>{t('nextSteps')}</span>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div
              className="px-6 py-5 flex gap-3"
              style={{ backgroundColor: 'var(--bg-light)', borderTop: '1px solid var(--border-light)' }}
            >
              <Button
                asChild
                className="flex-1"
                style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}
              >
                <Link href="/">{t('returnHome')}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1"
                style={{ borderColor: 'var(--primary-base)', color: 'var(--primary-base)' }}
              >
                <Link href="/tours">{t('browseTours')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upsells Section */}
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
                  More Tours You&apos;ll Love
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
    </div>
  );
}
