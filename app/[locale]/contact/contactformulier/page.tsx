'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Phone, MapPin } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
  consent: z.boolean().refine((val) => val === true),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const t = useTranslations('forms');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      consent: false,
    },
  });

  const consent = watch('consent');

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success('Bericht verzonden!');
    reset();
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
        <div>
          <h1 className="mb-8 text-4xl font-bold">Contact</h1>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Adres</p>
                <p className="text-muted-foreground">Groenplaats 1</p>
                <p className="text-muted-foreground">2000 Antwerpen</p>
                <p className="text-muted-foreground">België</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Email</p>
                <a href="mailto:info@beroepsbelg.be" className="text-muted-foreground hover:text-foreground">
                  info@beroepsbelg.be
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Telefoon</p>
                <a href="tel:+32123456789" className="text-muted-foreground hover:text-foreground">
                  +32 123 456 789
                </a>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-6 text-2xl font-bold">Stuur ons een bericht</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="name">{t('name')}*</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="mt-1 text-sm text-destructive">{t('required')}</p>}
            </div>
            <div>
              <Label htmlFor="email">{t('email')}*</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-sm text-destructive">{t('invalidEmail')}</p>}
            </div>
            <div>
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input id="phone" type="tel" {...register('phone')} />
            </div>
            <div>
              <Label htmlFor="message">{t('message')}*</Label>
              <Textarea id="message" rows={5} {...register('message')} />
              {errors.message && <p className="mt-1 text-sm text-destructive">{t('required')}</p>}
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(checked) => setValue('consent', checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="consent" className="text-sm">
                Ik ga akkoord met de privacy policy
              </Label>
            </div>
            {errors.consent && <p className="text-sm text-destructive">{t('required')}</p>}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {t('submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
