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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Users, MapPin, Languages, Building2, Sparkles, CheckCircle2, Home, ShoppingBag, ExternalLink } from 'lucide-react';
import { cities } from '@/lib/data/cities';
import { tours } from '@/lib/data/tours';

const quoteSchema = z.object({
  dateTime: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  city: z.string().min(1),
  tour: z.string().min(1),
  language: z.string().min(1),
  numberOfPeople: z.string().min(1),
  tourType: z.string().min(1),
  companyName: z.string().optional(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  billingInfo: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

export default function B2BQuotePage() {
  const t = useTranslations('b2b');
  const tForms = useTranslations('forms');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

  const selectedCity = watch('city');
  const selectedTour = watch('tour');
  const selectedLanguage = watch('language');

  const availableTours = selectedCity
    ? tours.filter((tour) => tour.citySlug === selectedCity && tour.slug !== 'cadeaubon')
    : [];

  useEffect(() => {
    if (selectedCity) {
      setValue('tour', '');
    }
  }, [selectedCity, setValue]);

  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      router.push(`/${locale}/webshop`);
    }
  }, [isSuccess, countdown, router, locale]);

  const onSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        dateTime: data.dateTime,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        city: data.city,
        tour: data.tour,
        language: data.language,
        numberOfPeople: data.numberOfPeople,
        tourType: data.tourType,
        companyName: data.companyName || null,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        billingInfo: data.billingInfo || null,
        additionalInfo: data.additionalInfo || null,
        submittedAt: new Date().toISOString(),
      };

      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook-test/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccess(true);
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

  const availableCities = cities.filter(city => city.status === 'live');
  const tourLanguages = ['nl', 'en', 'fr', 'de'];

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brass-light)' }}>
              <CheckCircle2 className="h-12 w-12" style={{ color: 'var(--brass)' }} />
            </div>
            <h1 className="mb-4 text-4xl font-bold font-serif text-navy">{t('successTitle')}</h1>
            <p className="mb-8 text-lg" style={{ color: 'var(--slate-blue)' }}>{t('successMessage')}</p>
            <p className="mb-8 text-sm" style={{ color: 'var(--slate-blue)' }}>{t('redirecting', { seconds: countdown })}</p>
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

          <div className="mb-8 flex justify-center gap-2">
            <div className={`h-2 w-24 rounded-full transition-all`} style={{ backgroundColor: step >= 1 ? 'var(--brass)' : '#e5e7eb' }} />
            <div className={`h-2 w-24 rounded-full transition-all`} style={{ backgroundColor: step >= 2 ? 'var(--brass)' : '#e5e7eb' }} />
            <div className={`h-2 w-24 rounded-full transition-all`} style={{ backgroundColor: step >= 3 ? 'var(--brass)' : '#e5e7eb' }} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rounded-2xl p-8 brass-corner shadow-lg" style={{ backgroundColor: '#faf8f5' }}>
            {step === 1 && (
              <div
                className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                onKeyDown={(e) => handleKeyDown(e, () => setStep(2))}
              >
                <div>
                  <Label htmlFor="dateTime" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <Calendar className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    {t('dateTime')}*
                  </Label>
                  <p className="mb-2 text-sm" style={{ color: 'var(--slate-blue)' }}>{t('dateTimeHelper')}</p>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    {...register('dateTime')}
                    className="mt-2"
                  />
                  {errors.dateTime && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                <div className="rounded-lg p-4" style={{ backgroundColor: '#f5f2ed' }}>
                  <p className="mb-3 text-sm font-medium text-navy">{t('dateRange')}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="startDate" className="text-sm">{t('startDate')}</Label>
                      <Input id="startDate" type="date" {...register('startDate')} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-sm">{t('endDate')}</Label>
                      <Input id="endDate" type="date" {...register('endDate')} className="mt-1" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="city" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <MapPin className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    {t('city')}*
                  </Label>
                  <Select value={selectedCity} onValueChange={(value) => setValue('city', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={t('cityPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city.slug} value={city.slug}>
                          {city.name.nl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.city && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                {selectedCity && availableTours.length > 0 && (
                  <div>
                    <Label htmlFor="tour" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Building2 className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('tour')}*
                    </Label>
                    <Select value={selectedTour} onValueChange={(value) => setValue('tour', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={t('tourPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTours.map((tour) => (
                          <SelectItem key={tour.slug} value={tour.slug}>
                            {tour.title.nl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.tour && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                    {selectedTour && (
                      <button
                        type="button"
                        onClick={() => window.open(`/${locale}/tours-${selectedCity}/${selectedTour}`, '_blank')}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70 cursor-pointer"
                        style={{ color: 'var(--brass)' }}
                      >
                        {t('viewTour')}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="language" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <Languages className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    {t('language')}*
                  </Label>
                  <Select value={selectedLanguage} onValueChange={(value) => setValue('language', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={t('languagePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {tourLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {t(`languages.${lang}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.language && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full btn-secondary"
                >
                  {t('next')}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div
                className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                onKeyDown={(e) => handleKeyDown(e, () => setStep(3))}
              >
                <div>
                  <Label htmlFor="numberOfPeople" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <Users className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    {t('numberOfPeople')}*
                  </Label>
                  <Input
                    id="numberOfPeople"
                    type="number"
                    min="1"
                    placeholder={t('numberOfPeoplePlaceholder')}
                    {...register('numberOfPeople')}
                    className="mt-2"
                  />
                  {errors.numberOfPeople && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                <div>
                  <Label htmlFor="tourType" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <Building2 className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    {t('tourType')}*
                  </Label>
                  <Input
                    id="tourType"
                    placeholder={t('tourTypePlaceholder')}
                    {...register('tourType')}
                    className="mt-2"
                  />
                  {errors.tourType && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                <div>
                  <Label htmlFor="companyName" className="text-base font-semibold text-navy">
                    {t('companyName')}
                  </Label>
                  <Input
                    id="companyName"
                    placeholder={t('companyNamePlaceholder')}
                    {...register('companyName')}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('back')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 btn-secondary"
                  >
                    {t('next')}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <Label htmlFor="contactName" className="text-base font-semibold text-navy">
                    {t('contactName')}*
                  </Label>
                  <Input
                    id="contactName"
                    {...register('contactName')}
                    className="mt-2"
                  />
                  {errors.contactName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                <div>
                  <Label htmlFor="contactEmail" className="text-base font-semibold text-navy">
                    {t('contactEmail')}*
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    {...register('contactEmail')}
                    className="mt-2"
                  />
                  {errors.contactEmail && <p className="mt-1 text-sm text-destructive">{tForms('invalidEmail')}</p>}
                </div>

                <div>
                  <Label htmlFor="contactPhone" className="text-base font-semibold text-navy">
                    {t('contactPhone')}*
                  </Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    {...register('contactPhone')}
                    className="mt-2"
                  />
                  {errors.contactPhone && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                <div>
                  <Label htmlFor="billingInfo" className="text-base font-semibold text-navy">
                    {t('billingInfo')}
                  </Label>
                  <Textarea
                    id="billingInfo"
                    rows={3}
                    placeholder={t('billingInfoPlaceholder')}
                    {...register('billingInfo')}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="additionalInfo" className="text-base font-semibold text-navy">
                    {t('additionalInfo')}
                  </Label>
                  <Textarea
                    id="additionalInfo"
                    rows={4}
                    placeholder={t('additionalInfoPlaceholder')}
                    {...register('additionalInfo')}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('back')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary"
                  >
                    {t('submit')}
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
