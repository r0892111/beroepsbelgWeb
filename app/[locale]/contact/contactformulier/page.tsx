'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Phone, MapPin } from 'lucide-react';
import { sendContactFormWebhook } from '@/lib/utils/webhooks';

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
  consent: z.boolean().refine((val) => val === true),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const t = useTranslations('contact');
  const tForms = useTranslations('forms');
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
    console.log('Contact form:', data);
    
    // Send to n8n webhook (non-blocking)
    sendContactFormWebhook({
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      consent: data.consent,
    });
    
    toast.success(t('successMessage'));
    reset();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#1BDD95]">
      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-oswald text-5xl md:text-7xl text-white uppercase tracking-tight mb-4">
            {t('getInTouch')}
          </h1>
          <p className="font-inter text-lg text-white/90 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Contact Info Cards (2/5 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-oswald font-bold text-lg mb-2 text-neutral-900">{t('addressLabel')}</h3>
              <p className="font-inter text-neutral-600">2000 Antwerpen</p>
              <p className="font-inter text-neutral-600">België</p>
            </div>

            {/* Email Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-oswald font-bold text-lg mb-2 text-neutral-900">{t('emailLabel')}</h3>
              <a
                href="mailto:info@beroepsbelg.be"
                className="font-inter text-neutral-600 hover:text-[#1BDD95] transition-colors"
              >
                info@beroepsbelg.be
              </a>
            </div>

            {/* Phone Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300">
              <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center mb-4">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-oswald font-bold text-lg mb-2 text-neutral-900">{t('phoneLabel')}</h3>
              <a
                href="tel:+32494254159"
                className="font-inter text-neutral-600 hover:text-[#1BDD95] transition-colors"
              >
                +32 494 25 41 59
              </a>
            </div>
          </div>

          {/* Right Column - Contact Form (3/5 width) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl">
              <h2 className="font-oswald text-2xl font-bold text-neutral-900 mb-6 uppercase tracking-tight">
                {t('formHeading')}
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label
                    htmlFor="name"
                    className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                  >
                    {tForms('name')}*
                  </label>
                  <Input
                    id="name"
                    {...register('name')}
                    className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors"
                  />
                  {errors.name && <p className="mt-2 text-sm text-red-600">{tForms('required')}</p>}
                </div>

                {/* Email Field */}
                <div>
                  <label
                    htmlFor="email"
                    className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                  >
                    {tForms('email')}*
                  </label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors"
                  />
                  {errors.email && <p className="mt-2 text-sm text-red-600">{tForms('invalidEmail')}</p>}
                </div>

                {/* Phone Field */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                  >
                    {tForms('phone')}
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors"
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label
                    htmlFor="message"
                    className="block font-oswald text-sm uppercase tracking-wider font-semibold text-neutral-700 mb-2"
                  >
                    {tForms('message')}*
                  </label>
                  <Textarea
                    id="message"
                    rows={5}
                    {...register('message')}
                    className="w-full px-4 py-3 border-2 border-neutral-200 rounded-lg font-inter focus:border-[#1BDD95] focus:ring-0 transition-colors min-h-[150px] resize-none"
                  />
                  {errors.message && <p className="mt-2 text-sm text-red-600">{tForms('required')}</p>}
                </div>

                {/* Consent Checkbox */}
                <div className="flex items-start gap-3 pt-2">
                  <Checkbox
                    id="consent"
                    checked={consent}
                    onCheckedChange={(checked) => setValue('consent', checked as boolean)}
                    className="mt-1 data-[state=checked]:bg-[#1BDD95] data-[state=checked]:border-[#1BDD95]"
                  />
                  <label htmlFor="consent" className="font-inter text-sm text-neutral-700 cursor-pointer">
                    {t('consentText')}
                  </label>
                </div>
                {errors.consent && <p className="text-sm text-red-600">{tForms('required')}</p>}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1BDD95] hover:bg-[#14BE82] text-white font-oswald font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                  {isSubmitting ? t('sending') : tForms('submit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
