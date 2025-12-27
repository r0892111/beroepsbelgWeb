'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Users, MapPin, Languages, Building2, Sparkles, CheckCircle2, Home, ShoppingBag, ExternalLink, Clock, Gift, FileText, Loader2 } from 'lucide-react';
// Removed direct imports - will fetch from API instead
import type { City, Tour, Product } from '@/lib/data/types';
import Image from 'next/image';

const quoteSchema = z.object({
  dateTime: z.string().min(1),
  city: z.string().min(1),
  tourId: z.string().min(1),
  language: z.string().min(1),
  numberOfPeople: z.string().min(1),
  companyName: z.string().optional(),
  contactFirstName: z.string().min(1),
  contactLastName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  vatNumber: z.string().optional(),
  billingAddress: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

export default function B2BQuotePage() {
  const t = useTranslations('b2b');
  const tForms = useTranslations('forms');
  const tCheckout = useTranslations('checkout');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'select' | 'contact' | 'upsell' | 'payment' | 'success'>('select');
  const [cities, setCities] = useState<City[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedUpsell, setSelectedUpsell] = useState<string[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [bookingType, setBookingType] = useState<'particulier' | 'zakelijk'>('particulier');
  const [jotFormUrl, setJotFormUrl] = useState<string>('');
  const [isOpMaat, setIsOpMaat] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

  const selectedCity = watch('city');
  const selectedTourId = watch('tourId');
  const numberOfPeople = watch('numberOfPeople');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const selectedTour = tours.find((tour) => (tour.id ?? tour.slug) === selectedTourId);

  const numPeople = parseInt(numberOfPeople) || 0;

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}u ${mins}min`;
    if (hours > 0) return `${hours} uur`;
    return `${mins} min`;
  };

  // Generate time slots between 10:00 and 18:00 based on tour duration
  const generateTimeSlots = () => {
    const durationMinutes = selectedTour?.durationMinutes ?? 120; // Default 2 hours

    // Check if this is a "Local Stories" tour - restrict to 14:00-16:00 only
    if (selectedTour?.local_stories === true) {
      return [{
        value: '14:00',
        label: '14:00 - 16:00'
      }];
    }

    const startHour = 10; // 10:00
    const endHour = 18; // 18:00
    const slots: { value: string; label: string }[] = [];

    let currentMinutes = startHour * 60; // Start at 10:00 in minutes
    const endMinutes = endHour * 60; // End at 18:00 in minutes

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    while (currentMinutes + durationMinutes <= endMinutes) {
      const startTime = formatTime(currentMinutes);
      const endTime = formatTime(currentMinutes + durationMinutes);
      slots.push({
        value: startTime,
        label: `${startTime} - ${endTime}`
      });
      currentMinutes += durationMinutes;
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      try {
        // Fetch from API routes instead of direct imports
        const [citiesRes, toursRes, productsRes] = await Promise.all([
          fetch('/api/cities').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/tours').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/products').then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        
        if (!isMounted) return;

        setCities(citiesRes);
        setTours(toursRes);
        setProducts(productsRes.slice(0, 6)); // Get 6 products for upsell
        setDataError(null);
      } catch (error) {
        console.error('[B2BQuotePage] Failed to load data', error);
        if (isMounted) {
          setDataError(t('error'));
        }
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const availableTours = selectedCity
    ? tours.filter((tour) => tour.city === selectedCity && tour.slug !== 'cadeaubon')
    : [];

  useEffect(() => {
    if (selectedCity) {
      setValue('tourId', '');
      setSelectedDate('');
      setSelectedTimeSlot('');
      setValue('dateTime', '');
    }
  }, [selectedCity, setValue]);

  useEffect(() => {
    if (selectedTourId) {
      setSelectedDate('');
      setSelectedTimeSlot('');
      setValue('dateTime', '');
      setValue('language', ''); // Reset language when tour changes
    }
  }, [selectedTourId, setValue]);

  // Auto-select language if only one is available
  useEffect(() => {
    if (selectedTour && selectedTour.languages.length === 1) {
      setValue('language', selectedTour.languages[0]);
    }
  }, [selectedTour, setValue]);

  // Combine date + timeslot
  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      const [startHour] = selectedTimeSlot.split(' to ');
      const dateTimeString = `${selectedDate}T${startHour}`;
      setValue('dateTime', dateTimeString);
    }
  }, [selectedDate, selectedTimeSlot, setValue]);

  // Success countdown
  useEffect(() => {
    if (step === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 'success' && countdown === 0) {
      router.push(`/${locale}`);
    }
  }, [step, countdown, router, locale]);

  const goToContact = () => {
    if (!selectedTour) {
      toast.error(t('selectTour'));
      return;
    }
    if (!selectedDate || !selectedTimeSlot) {
      toast.error(t('selectDateAndTime'));
      return;
    }
    if (!numberOfPeople || parseInt(numberOfPeople) < 1) {
      toast.error(t('fillNumberOfPeople'));
      return;
    }
    setStep('contact');
  };

  const goToUpsell = () => {
    setStep('upsell');
  };

  const goToPayment = () => {
    setStep('payment');
  };

  const toggleUpsell = (productId: string) => {
    setSelectedUpsell(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const onSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true);

    try {
      const selectedCityData = cities.find((city) => city.slug === data.city);
      const selectedTourData = tours.find((tour) => tour.id === data.tourId);
      const upsellProducts = products.filter(p => selectedUpsell.includes(p.uuid));

      // Check if selected tour is op maat BEFORE making webhook call
      const tourIsOpMaat = selectedTourData?.op_maat === true || 
                          (typeof selectedTourData?.op_maat === 'string' && selectedTourData.op_maat === 'true') || 
                          (typeof selectedTourData?.op_maat === 'number' && selectedTourData.op_maat === 1);
      
      // For op maat tours, skip webhook call - JotForm will trigger it when submitted
      // Note: JotForm must be configured in its settings to call the webhook:
      // https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc
      if (!tourIsOpMaat) {
        const payload = {
          // Tour info
          dateTime: data.dateTime,
          citySlug: data.city,
          cityName: selectedCityData?.name ?? null,
          tourId: data.tourId,
          tourSlug: selectedTourData?.slug ?? null,
          tourTitle: selectedTourData?.title ?? null,
          tourDetails: {
            startLocation: selectedTourData?.startLocation ?? null,
            endLocation: selectedTourData?.endLocation ?? null,
            durationMinutes: selectedTourData?.durationMinutes ?? null,
            languages: selectedTourData?.languages ?? null,
            type: selectedTourData?.type ?? null,
          },
          language: data.language,
          numberOfPeople: data.numberOfPeople,
          // Company info
          companyName: data.companyName || null,
          vatNumber: data.vatNumber || null,
          billingAddress: data.billingAddress || null,
          // Contact info
          contactFirstName: data.contactFirstName,
          contactLastName: data.contactLastName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          additionalInfo: data.additionalInfo || null,
          // Upsell
          upsellProducts: upsellProducts.map(p => ({
            id: p.uuid,
            title: p.title.nl,
          })),
          // Booking type
          bookingType,
          // Meta
          submittedAt: new Date().toISOString(),
          status: 'pending_guide_confirmation',
        };

        const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          toast.error(t('error'));
          return;
        }
      }

      // Set op maat state and build JotForm URL if needed
      setIsOpMaat(tourIsOpMaat);
      
      if (tourIsOpMaat && process.env.NEXT_PUBLIC_JOTFORM_ID) {
        const baseUrl = `https://form.jotform.com/${process.env.NEXT_PUBLIC_JOTFORM_ID}`;
        const params = new URLSearchParams();
        
        // Field unique names - these must match the "Unique Name" from JotForm Advanced tab
        const FIELD_BOOKING_NUMBER = process.env.NEXT_PUBLIC_JOTFORM_FIELD_BOOKING_NUMBER || 'typEen';
        const FIELD_EMAIL = process.env.NEXT_PUBLIC_JOTFORM_FIELD_EMAIL || 'email11';
        const FIELD_TOUR_DATE = process.env.NEXT_PUBLIC_JOTFORM_FIELD_TOUR_DATE || 'datum';
        
        // Pre-fill email
        if (data.contactEmail) {
          params.append(FIELD_EMAIL, data.contactEmail);
        }
        
        // Pre-fill tour date if available
        if (data.dateTime) {
          try {
            const dateObj = new Date(data.dateTime);
            if (!isNaN(dateObj.getTime())) {
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const year = dateObj.getFullYear();
              const formattedDate = `${month}-${day}-${year}`;
              params.append(FIELD_TOUR_DATE, formattedDate);
            }
          } catch (e) {
            console.error('Error formatting date for JotForm:', e);
          }
        }
        
        const jotFormUrlWithParams = `${baseUrl}?${params.toString()}`;
        setJotFormUrl(jotFormUrlWithParams);
      }
      
      setStep('success');
      reset();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show cities that are live AND have at least one tour (excluding gift cards)
  const availableCities = cities.filter(city => 
    city.status === 'live' && 
    tours.some(tour => tour.city === city.slug && tour.slug !== 'cadeaubon')
  );
  
  // Get available languages from the selected tour
  const availableLanguages = selectedTour?.languages ?? [];

  // Map language names to codes for translation
  const languageNameToCode: Record<string, string> = {
    'Nederlands': 'nl',
    'Engels': 'en',
    'Frans': 'fr',
    'Duits': 'de',
    'Spaans': 'es',
    'Italiaans': 'it',
    'Portugees': 'pt',
    'Pools': 'pl',
    'Russisch': 'ru',
    'Chinees': 'zh',
    'Japans': 'ja',
  };

  const getLanguageLabel = (lang: string) => {
    // If it's already a language name (like "Engels"), use it directly
    if (languageNameToCode[lang]) {
      const code = languageNameToCode[lang];
      return t(`languages.${code}`, { default: lang });
    }
    // If it's a code (like "en"), translate it
    return t(`languages.${lang}`, { default: lang });
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <div className="text-center space-y-4">
          <p className="text-red-600">{dataError}</p>
          <Button onClick={() => window.location.reload()}>{t('tryAgain')}</Button>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brass-light)' }}>
              <CheckCircle2 className="h-12 w-12" style={{ color: 'var(--brass)' }} />
            </div>
            <h1 className="mb-4 text-4xl font-bold font-serif text-navy">{t('successTitle')}</h1>
            <p className="mb-4 text-lg" style={{ color: 'var(--slate-blue)' }}>
              {t('requestSent')}
            </p>
            <p className="mb-8 text-base" style={{ color: 'var(--slate-blue)' }}>
              {t('checkAvailability')}
            </p>
            <p className="mb-8 text-sm" style={{ color: 'var(--slate-blue)' }}>
              {t('redirectingIn', { countdown })}
            </p>
            
            {isOpMaat && process.env.NEXT_PUBLIC_JOTFORM_ID && (
              <div className="mb-8 rounded-lg border-2 p-6 text-left" style={{ borderColor: 'var(--brass)' }}>
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
                      key={jotFormUrl}
                      onLoad={() => {
                        console.log('JotForm iframe loaded');
                        console.log('Full URL:', jotFormUrl);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">{t('formLoading')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => router.push(`/${locale}`)}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                {t('backToHome')}
              </Button>
              <Button
                onClick={() => router.push(`/${locale}/webshop`)}
                size="lg"
                className="gap-2 btn-primary"
              >
                <ShoppingBag className="h-4 w-4" />
                {t('exploreWebshop')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepNumber = step === 'select' ? 1 : step === 'contact' ? 2 : step === 'upsell' ? 3 : 4;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fdfcfa' }}>
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-navy" style={{ backgroundColor: 'var(--brass-light)' }}>
              <Sparkles className="h-4 w-4" />
              B2B Offertes
            </div>
            <h1 className="mb-3 text-4xl font-bold font-serif text-navy">{t('title')}</h1>
            <p className="text-lg" style={{ color: 'var(--slate-blue)' }}>{t('subtitle')}</p>
          </div>

          {/* Progress steps */}
          <div className="mb-8 flex justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="h-2 w-20 rounded-full transition-all"
                style={{ backgroundColor: stepNumber >= s ? 'var(--brass)' : '#e5e7eb' }}
              />
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rounded-2xl p-8 brass-corner shadow-lg" style={{ backgroundColor: '#faf8f5' }}>
            
            {/* Step 1: Select Tour & Date */}
            {step === 'select' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">{t('step1')}</h2>
                
                <div>
                  <Label htmlFor="city" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <MapPin className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    {t('cityLabel')}
                  </Label>
                  <Select value={selectedCity} onValueChange={(value) => setValue('city', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={t('selectCity')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city.slug} value={city.slug}>
                          {city.name.nl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCity && availableTours.length > 0 && (
                  <div>
                    <Label htmlFor="tour" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Building2 className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('tourLabel')}
                    </Label>
                    <Select value={selectedTourId} onValueChange={(value) => setValue('tourId', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={t('selectTour')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTours.map((tour) => (
                          <SelectItem key={tour.id ?? tour.slug} value={tour.id ?? tour.slug}>
                            {tour.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => window.open(`/${locale}/tours`, '_blank')}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--brass)' }}
                    >
                      {t('viewAllTours')} <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {selectedTour && (
                  <div className="p-4 rounded-lg border-2" style={{ borderColor: 'var(--brass)', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <h3 className="font-semibold text-navy mb-2">{selectedTour.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(selectedTour.durationMinutes)}
                      </span>
                      {selectedTour.languages.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Languages className="h-4 w-4" />
                          {selectedTour.languages.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {selectedTour && availableLanguages.length > 0 && (
                  <div>
                    <Label htmlFor="language" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Languages className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('languageLabel')}
                    </Label>
                    <Select value={watch('language')} onValueChange={(value) => setValue('language', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={t('selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {getLanguageLabel(lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('availableLanguages')}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Calendar className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('dateLabel')}
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeSlot" className="text-base font-semibold text-navy">
                      {t('timeSlotLabel')}
                    </Label>
                    <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot} disabled={!selectedTour}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={selectedTour ? t('selectTime') : t('selectTourFirst')} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTour && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedTour.local_stories
                          ? t('localStoriesTime')
                          : t('tourDuration', { duration: formatDuration(selectedTour.durationMinutes) })
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="numberOfPeople" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Users className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('numberOfPeopleLabel')}
                    </Label>
                    <Input
                      id="numberOfPeople"
                      type="number"
                      min="1"
                      placeholder={t('peoplePlaceholder')}
                      {...register('numberOfPeople')}
                      className="mt-2"
                    />
                  </div>
                </div>

                <Button type="button" onClick={goToContact} className="w-full btn-primary" disabled={!selectedTour || !selectedDate || !selectedTimeSlot || numPeople < 1}>
                  {t('continueButton')}
                </Button>
              </div>
            )}

            {/* Step 2: Contact & Company Info */}
            {step === 'contact' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">{t('step2')}</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactFirstName" className="text-base font-semibold text-navy">{t('firstName')}</Label>
                    <Input id="contactFirstName" {...register('contactFirstName')} className="mt-2" />
                    {errors.contactFirstName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contactLastName" className="text-base font-semibold text-navy">{t('lastName')}</Label>
                    <Input id="contactLastName" {...register('contactLastName')} className="mt-2" />
                    {errors.contactLastName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail" className="text-base font-semibold text-navy">{t('emailLabel')}</Label>
                    <Input id="contactEmail" type="email" {...register('contactEmail')} className="mt-2" />
                    {errors.contactEmail && <p className="mt-1 text-sm text-destructive">{tForms('invalidEmail')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contactPhone" className="text-base font-semibold text-navy">{t('phoneLabel')}</Label>
                    <Input id="contactPhone" type="tel" {...register('contactPhone')} className="mt-2" />
                    {errors.contactPhone && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                </div>

                {/* Booking type toggle */}
                <div className="flex items-center justify-center py-4">
                  <div className="inline-flex rounded-lg border-2 p-1" style={{ borderColor: 'var(--brass)' }}>
                    <Button
                      type="button"
                      onClick={() => setBookingType('particulier')}
                      variant={bookingType === 'particulier' ? "default" : "ghost"}
                      className={`gap-2 ${bookingType === 'particulier' ? 'btn-primary' : ''}`}
                    >
                      {bookingType === 'particulier' && <CheckCircle2 className="h-4 w-4" />}
                      {t('individual')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setBookingType('zakelijk')}
                      variant={bookingType === 'zakelijk' ? "default" : "ghost"}
                      className={`gap-2 ${bookingType === 'zakelijk' ? 'btn-primary' : ''}`}
                    >
                      {bookingType === 'zakelijk' && <CheckCircle2 className="h-4 w-4" />}
                      <Building2 className="h-4 w-4" />
                      {t('business')}
                    </Button>
                  </div>
                </div>

                {bookingType === 'zakelijk' && (
                  <div className="space-y-4 p-6 rounded-lg border-2 animate-in fade-in slide-in-from-top-2 duration-300" style={{ borderColor: 'var(--brass)', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      <h3 className="font-semibold text-navy">{t('invoiceDetails')}</h3>
                    </div>

                    <div>
                      <Label htmlFor="companyName" className="text-base font-semibold text-navy">{t('companyNameLabel')}</Label>
                      <Input id="companyName" {...register('companyName')} className="mt-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vatNumber" className="text-base font-semibold text-navy">{t('vatNumber')}</Label>
                        <Input id="vatNumber" placeholder={t('vatPlaceholder')} {...register('vatNumber')} className="mt-2" />
                      </div>
                      <div>
                        <Label htmlFor="billingAddress" className="text-base font-semibold text-navy">{t('billingAddressLabel')}</Label>
                        <Input id="billingAddress" {...register('billingAddress')} className="mt-2" />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="additionalInfo" className="text-base font-semibold text-navy">{t('commentsLabel')}</Label>
                  <Textarea
                    id="additionalInfo"
                    rows={3}
                    placeholder={t('commentsPlaceholder')}
                    {...register('additionalInfo')}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('select')} variant="outline" className="flex-1">
                    {t('backButton')}
                  </Button>
                  <Button type="button" onClick={goToUpsell} className="flex-1 btn-primary">
                    {t('continueNext')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Upsell */}
            {step === 'upsell' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brass-light)' }}>
                    <Gift className="h-8 w-8" style={{ color: 'var(--brass)' }} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-navy mb-2">{t('step3Title')}</h2>
                  <p className="text-muted-foreground">{t('step3Subtitle')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.uuid}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleUpsell(product.uuid);
                      }}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedUpsell.includes(product.uuid)
                          ? 'border-brass bg-brass/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <Image src={product.image} alt={product.title.nl} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.title.nl}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {selectedUpsell.includes(product.uuid) ? (
                            <CheckCircle2 className="h-5 w-5 text-brass" />
                          ) : (
                            <div className="h-5 w-5 rounded border-2 border-gray-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedUpsell.length > 0 && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--brass-light)' }}>
                    <p className="font-semibold">{t('productsSelected', { count: selectedUpsell.length, plural: selectedUpsell.length > 1 ? 'en' : '' })}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('contact')} variant="outline" className="flex-1">
                    {t('backButton')}
                  </Button>
                  <Button type="button" onClick={goToPayment} className="flex-1 btn-primary">
                    {selectedUpsell.length > 0 ? t('continueWithProducts') : t('skip')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm Quote Request */}
            {step === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">{t('step4')}</h2>

                {/* Order summary */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: 'white', border: '2px solid var(--brass)' }}>
                  <h3 className="font-semibold text-navy mb-4">{t('summaryTitle')}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium text-navy">{selectedTour?.title}</div>
                    <div className="text-muted-foreground">
                      {t('participants', { count: numPeople, plural: numPeople > 1 ? 's' : '' })} • {selectedDate} om {selectedTimeSlot}
                    </div>
                    {selectedUpsell.length > 0 && (
                      <div className="pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                        <span>{t('extraProducts', { count: selectedUpsell.length })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {t('confirmationNote')}
                </p>

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('upsell')} variant="outline" className="flex-1">
                    {t('backButton')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 btn-primary">
                    {isSubmitting ? t('submitting') : t('confirmRequest')}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
