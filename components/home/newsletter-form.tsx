'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { type Locale } from '@/i18n';

const newsletterSchema = z.object({
  email: z.string().email(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the privacy policy',
  }),
});

type NewsletterFormData = z.infer<typeof newsletterSchema>;

interface NewsletterFormProps {
  locale: Locale;
}

export function NewsletterForm({ locale }: NewsletterFormProps) {
  const t = useTranslations('newsletter');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterSchema),
    defaultValues: {
      consent: false,
    },
  });

  const consent = watch('consent');

  const onSubmit = async (data: NewsletterFormData) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(t('success'));
    reset();
    setIsSubmitting(false);
  };

  return (
    <section className="bg-primary py-20 text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">{t('title')}</h2>
          <p className="mb-8 text-primary-foreground/90">{t('description')}</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder={t('email')}
                  {...register('email')}
                  className="bg-primary-foreground text-foreground"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="secondary"
                className="sm:w-auto"
              >
                {t('submit')}
              </Button>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setValue('consent', checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="consent" className="text-sm text-primary-foreground/90">
                {t('consent')}
              </Label>
            </div>
            {errors.consent && (
              <p className="text-sm text-red-300">{errors.consent.message}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
