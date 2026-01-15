'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, MessageCircle, Newspaper, HelpCircle, Briefcase } from 'lucide-react';
import { sendContactFormWebhook } from '@/lib/utils/webhooks';

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  message: z.string().min(10),
  consent: z.boolean().refine((val) => val === true),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const t = useTranslations('contact');
  const tNav = useTranslations('nav');
  const tForms = useTranslations('forms');
  const params = useParams();
  const locale = params.locale as string;
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
      email: '',
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

      {/* Quick Navigation Cards */}
      <div className="container mx-auto px-4 -mt-8 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {/* News Card */}
          <Link
            href={`/${locale}/blog`}
            className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center flex-shrink-0">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <span className="font-oswald font-bold text-lg text-neutral-900">{tNav('news')}</span>
          </Link>

          {/* FAQ Card */}
          <Link
            href={`/${locale}/faq`}
            className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <span className="font-oswald font-bold text-lg text-neutral-900">{tNav('faq')}</span>
          </Link>

          {/* Jobs Card */}
          <Link
            href={`/${locale}/jobs/become-a-guide`}
            className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-[#1BDD95] rounded-full flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="font-oswald font-bold text-lg text-neutral-900">{tNav('jobs')}</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
          {/* Left Column - Contact Info Cards (2/5 width) */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* WhatsApp Card */}
            <a
              href="https://wa.me/32494254159?text=Hallo%2C%20ik%20heb%20een%20vraag%20over..."
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-oswald font-bold text-lg mb-2 text-neutral-900">WhatsApp</h3>
              <p className="font-inter text-neutral-600 hover:text-[#25D366] transition-colors">
                +32 494 25 41 59
              </p>
            </a>
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
