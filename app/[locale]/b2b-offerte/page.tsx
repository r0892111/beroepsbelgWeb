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
import { Calendar, Users, MapPin, Languages, Building2, Sparkles, CheckCircle2, Home, ShoppingBag, ExternalLink, CreditCard, FileText, Clock, Gift } from 'lucide-react';
import { getCities, getTours, getProducts } from '@/lib/api/content';
import type { City, Tour, Product } from '@/lib/data/types';
import Image from 'next/image';

const quoteSchema = z.object({
  dateTime: z.string().min(1),
  city: z.string().min(1),
  tourId: z.string().min(1),
  language: z.string().min(1),
  numberOfPeople: z.string().min(1),
  companyName: z.string().optional(),
  contactName: z.string().min(1),
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
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'transfer'>('online');
  const [wantsInvoice, setWantsInvoice] = useState(true); // B2B always wants invoice
  const [countdown, setCountdown] = useState(5);

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
        const [citiesData, toursData, productsData] = await Promise.all([
          getCities(),
          getTours(),
          getProducts()
        ]);
        if (!isMounted) return;

        setCities(citiesData);
        setTours(toursData);
        setProducts(productsData.slice(0, 6)); // Get 6 products for upsell
        setDataError(null);
      } catch (error) {
        console.error('[B2BQuotePage] Failed to load data', error);
        if (isMounted) {
          setDataError('Kon de gegevens niet laden. Probeer het later opnieuw.');
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
      toast.error('Selecteer een tour');
      return;
    }
    if (!selectedDate || !selectedTimeSlot) {
      toast.error('Selecteer zowel een datum als een tijdslot');
      return;
    }
    if (!numberOfPeople || parseInt(numberOfPeople) < 1) {
      toast.error('Vul het aantal personen in');
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
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        additionalInfo: data.additionalInfo || null,
        // Payment
        paymentMethod,
        wantsInvoice,
        // Upsell
        upsellProducts: upsellProducts.map(p => ({
          id: p.uuid,
          title: p.title.nl,
        })),
        // Meta
        submittedAt: new Date().toISOString(),
        status: 'pending_guide_confirmation',
      };

      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook-test/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStep('success');
        reset();
      } else {
        toast.error(t('error'));
      }
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

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <p className="text-muted-foreground">Gegevens laden...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <div className="text-center space-y-4">
          <p className="text-red-600">{dataError}</p>
          <Button onClick={() => window.location.reload()}>Probeer opnieuw</Button>
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
              Uw aanvraag is verzonden.
            </p>
            <p className="mb-8 text-base" style={{ color: 'var(--slate-blue)' }}>
              We controleren de beschikbaarheid van de gids en nemen binnen 24 uur contact met u op met een bevestiging en betalingslink.
            </p>
            <p className="mb-8 text-sm" style={{ color: 'var(--slate-blue)' }}>
              U wordt over {countdown} seconden doorgestuurd...
            </p>
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
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">Stap 1: Selecteer tour en datum</h2>
                
                <div>
                  <Label htmlFor="city" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <MapPin className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    Stad*
                  </Label>
                  <Select value={selectedCity} onValueChange={(value) => setValue('city', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecteer een stad" />
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
                      Tour*
                    </Label>
                    <Select value={selectedTourId} onValueChange={(value) => setValue('tourId', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecteer een tour" />
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
                      Bekijk alle tours <ExternalLink className="h-3.5 w-3.5" />
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
                      Taal van de tour*
                    </Label>
                    <Select value={watch('language')} onValueChange={(value) => setValue('language', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecteer een taal" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {t(`languages.${lang}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Beschikbare talen voor deze tour
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Calendar className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      Datum*
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
                      Tijdslot*
                    </Label>
                    <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot} disabled={!selectedTour}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={selectedTour ? "Selecteer tijd" : "Selecteer eerst een tour"} />
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
                        Tourduur: {formatDuration(selectedTour.durationMinutes)}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="numberOfPeople" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Users className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      Aantal*
                    </Label>
                    <Input
                      id="numberOfPeople"
                      type="number"
                      min="1"
                      placeholder="Personen"
                      {...register('numberOfPeople')}
                      className="mt-2"
                    />
                  </div>
                </div>

                <Button type="button" onClick={goToContact} className="w-full btn-primary" disabled={!selectedTour || !selectedDate || !selectedTimeSlot || numPeople < 1}>
                  Verder →
                </Button>
              </div>
            )}

            {/* Step 2: Contact & Company Info */}
            {step === 'contact' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">Stap 2: Uw gegevens</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactName" className="text-base font-semibold text-navy">Contactpersoon*</Label>
                    <Input id="contactName" {...register('contactName')} className="mt-2" />
                    {errors.contactName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="companyName" className="text-base font-semibold text-navy">Bedrijfsnaam</Label>
                    <Input id="companyName" {...register('companyName')} className="mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail" className="text-base font-semibold text-navy">E-mail*</Label>
                    <Input id="contactEmail" type="email" {...register('contactEmail')} className="mt-2" />
                    {errors.contactEmail && <p className="mt-1 text-sm text-destructive">{tForms('invalidEmail')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contactPhone" className="text-base font-semibold text-navy">Telefoon*</Label>
                    <Input id="contactPhone" type="tel" {...register('contactPhone')} className="mt-2" />
                    {errors.contactPhone && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vatNumber" className="text-base font-semibold text-navy">BTW-nummer</Label>
                    <Input id="vatNumber" placeholder="BE0123456789" {...register('vatNumber')} className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="billingAddress" className="text-base font-semibold text-navy">Factuuradres</Label>
                    <Input id="billingAddress" {...register('billingAddress')} className="mt-2" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="additionalInfo" className="text-base font-semibold text-navy">Opmerkingen</Label>
                  <Textarea
                    id="additionalInfo"
                    rows={3}
                    placeholder="Eventuele bijzonderheden of wensen..."
                    {...register('additionalInfo')}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('select')} variant="outline" className="flex-1">
                    ← Terug
                  </Button>
                  <Button type="button" onClick={goToUpsell} className="flex-1 btn-primary">
                    Verder →
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
                  <h2 className="text-2xl font-serif font-bold text-navy mb-2">Wil je een extra cadeau toevoegen?</h2>
                  <p className="text-muted-foreground">Verras je deelnemers met onze boeken en geschenken</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.uuid}
                      onClick={() => toggleUpsell(product.uuid)}
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
                        <Checkbox checked={selectedUpsell.includes(product.uuid)} className="pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>

                {selectedUpsell.length > 0 && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--brass-light)' }}>
                    <p className="font-semibold">✓ {selectedUpsell.length} product{selectedUpsell.length > 1 ? 'en' : ''} geselecteerd</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('contact')} variant="outline" className="flex-1">
                    ← Terug
                  </Button>
                  <Button type="button" onClick={goToPayment} className="flex-1 btn-primary">
                    {selectedUpsell.length > 0 ? 'Verder met producten →' : 'Overslaan →'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Payment Options */}
            {step === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">Stap 4: Bevestig & betaal</h2>

                {/* Order summary */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: 'white', border: '2px solid var(--brass)' }}>
                  <h3 className="font-semibold text-navy mb-4">Overzicht</h3>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium text-navy">{selectedTour?.title}</div>
                    <div className="text-muted-foreground">
                      {numPeople} deelnemer{numPeople > 1 ? 's' : ''} • {selectedDate} om {selectedTimeSlot}
                    </div>
                    {selectedUpsell.length > 0 && (
                      <div className="pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                        <span>Extra producten: {selectedUpsell.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <Label className="text-base font-semibold text-navy mb-3 block">Betaalmethode</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setPaymentMethod('online')}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        paymentMethod === 'online' ? 'border-brass bg-brass/5' : 'border-gray-200'
                      }`}
                    >
                      <CreditCard className="h-6 w-6" style={{ color: paymentMethod === 'online' ? 'var(--brass)' : '#9ca3af' }} />
                      <div>
                        <p className="font-medium">Online betaling</p>
                        <p className="text-xs text-muted-foreground">Kaart, Bancontact, Apple Pay</p>
                      </div>
                    </div>
                    <div
                      onClick={() => setPaymentMethod('transfer')}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        paymentMethod === 'transfer' ? 'border-brass bg-brass/5' : 'border-gray-200'
                      }`}
                    >
                      <FileText className="h-6 w-6" style={{ color: paymentMethod === 'transfer' ? 'var(--brass)' : '#9ca3af' }} />
                      <div>
                        <p className="font-medium">Overschrijving</p>
                        <p className="text-xs text-muted-foreground">Factuur via e-mail</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Na bevestiging controleren wij de beschikbaarheid van de gids en ontvangt u een bevestigingsmail met {paymentMethod === 'online' ? 'een betaallink' : 'factuur'}.
                </p>

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('upsell')} variant="outline" className="flex-1">
                    ← Terug
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 btn-primary">
                    {isSubmitting ? 'Bezig...' : 'Bevestig aanvraag'}
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
