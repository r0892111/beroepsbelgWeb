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
import { Calendar, Users, MapPin, Languages, Building2, Sparkles, CheckCircle2, Home, ShoppingBag } from 'lucide-react';
import { cities } from '@/lib/data/cities';

const quoteSchema = z.object({
  dateTime: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  city: z.string().min(1),
  language: z.string().min(1),
  numberOfPeople: z.string().min(1),
  tourType: z.string().min(1),
  companyName: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
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
  const selectedLanguage = watch('language');

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
        language: data.language,
        numberOfPeople: data.numberOfPeople,
        tourType: data.tourType,
        companyName: data.companyName || null,
        firstName: data.firstName,
        lastName: data.lastName,
        contactName: `${data.firstName} ${data.lastName}`,
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
      <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5 flex items-center justify-center">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#92F0B1]/20">
              <CheckCircle2 className="h-12 w-12 text-[#92F0B1]" />
            </div>
            <h1 className="mb-4 text-4xl font-bold text-[#0d1117]">{t('successTitle')}</h1>
            <p className="mb-8 text-lg text-[#6b7280]">{t('successMessage')}</p>
            <p className="mb-8 text-sm text-[#6b7280]">{t('redirecting', { seconds: countdown })}</p>
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
                className="gap-2 bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]"
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
    <div className="min-h-screen bg-gradient-to-br from-[#92F0B1]/10 via-white to-[#92F0B1]/5">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#92F0B1]/20 px-4 py-2 text-sm font-medium text-[#0d1117]">
              <Sparkles className="h-4 w-4" />
              B2B Offertes
            </div>
            <h1 className="mb-3 text-4xl font-bold text-[#0d1117]">{t('title')}</h1>
            <p className="text-lg text-[#6b7280]">{t('subtitle')}</p>
          </div>

          <div className="mb-8 flex justify-center gap-2">
            <div className={`h-2 w-24 rounded-full transition-all ${step >= 1 ? 'bg-[#92F0B1]' : 'bg-gray-200'}`} />
            <div className={`h-2 w-24 rounded-full transition-all ${step >= 2 ? 'bg-[#92F0B1]' : 'bg-gray-200'}`} />
            <div className={`h-2 w-24 rounded-full transition-all ${step >= 3 ? 'bg-[#92F0B1]' : 'bg-gray-200'}`} />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rounded-2xl bg-white p-8 shadow-lg">
            {step === 1 && (
              <div
                className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
                onKeyDown={(e) => handleKeyDown(e, () => setStep(2))}
              >
                <div>
                  <Label htmlFor="dateTime" className="flex items-center gap-2 text-base font-semibold">
                    <Calendar className="h-5 w-5 text-[#92F0B1]" />
                    {t('dateTime')}*
                  </Label>
                  <p className="mb-2 text-sm text-[#6b7280]">{t('dateTimeHelper')}</p>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    {...register('dateTime')}
                    className="mt-2"
                  />
                  {errors.dateTime && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                </div>

                <div className="rounded-lg bg-[#92F0B1]/5 p-4">
                  <p className="mb-3 text-sm font-medium text-[#0d1117]">{t('dateRange')}</p>
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
                  <Label htmlFor="city" className="flex items-center gap-2 text-base font-semibold">
                    <MapPin className="h-5 w-5 text-[#92F0B1]" />
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

                <div>
                  <Label htmlFor="language" className="flex items-center gap-2 text-base font-semibold">
                    <Languages className="h-5 w-5 text-[#92F0B1]" />
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
                  className="w-full bg-[#0d1117] hover:bg-[#0d1117]/90"
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
                  <Label htmlFor="numberOfPeople" className="flex items-center gap-2 text-base font-semibold">
                    <Users className="h-5 w-5 text-[#92F0B1]" />
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
                  <Label htmlFor="tourType" className="flex items-center gap-2 text-base font-semibold">
                    <Building2 className="h-5 w-5 text-[#92F0B1]" />
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
                  <Label htmlFor="companyName" className="text-base font-semibold">
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
                    className="flex-1 bg-[#0d1117] hover:bg-[#0d1117]/90"
                  >
                    {t('next')}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-base font-semibold">
                      {t('firstName')}*
                    </Label>
                    <Input
                      id="firstName"
                      {...register('firstName')}
                      className="mt-2"
                    />
                    {errors.firstName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-base font-semibold">
                      {t('lastName')}*
                    </Label>
                    <Input
                      id="lastName"
                      {...register('lastName')}
                      className="mt-2"
                    />
                    {errors.lastName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="contactEmail" className="text-base font-semibold">
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
                  <Label htmlFor="contactPhone" className="text-base font-semibold">
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
                  <Label htmlFor="billingInfo" className="text-base font-semibold">
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
                  <Label htmlFor="additionalInfo" className="text-base font-semibold">
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
                    className="flex-1 bg-[#92F0B1] text-[#0d1117] hover:bg-[#6ee7a8]"
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
