import { type Locale, locales } from '@/i18n';
import { getFaqItems } from '@/lib/api/content';
import { getTranslations } from 'next-intl/server';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ToursCTABanner } from '@/components/upsells/tours-cta-banner';
import type { Metadata } from 'next';
import { FaqPageJsonLd } from '@/components/seo/json-ld';

const BASE_URL = 'https://beroepsbelg.be';

const pageMetadata: Record<Locale, { title: string; description: string }> = {
  nl: {
    title: 'Veelgestelde Vragen (FAQ) | BeroepsBelg',
    description: 'Vind antwoorden op veelgestelde vragen over onze stadswandelingen, boekingen, prijzen en meer. Alles wat je moet weten over BeroepsBelg tours.',
  },
  en: {
    title: 'Frequently Asked Questions (FAQ) | BeroepsBelg',
    description: 'Find answers to frequently asked questions about our city tours, bookings, prices and more. Everything you need to know about BeroepsBelg tours.',
  },
  fr: {
    title: 'Questions Fréquemment Posées (FAQ) | BeroepsBelg',
    description: 'Trouvez des réponses aux questions fréquemment posées sur nos visites guidées, réservations, prix et plus encore.',
  },
  de: {
    title: 'Häufig Gestellte Fragen (FAQ) | BeroepsBelg',
    description: 'Finden Sie Antworten auf häufig gestellte Fragen zu unseren Stadtführungen, Buchungen, Preisen und mehr.',
  },
};

interface FaqPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { locale } = await params;
  const meta = pageMetadata[locale] || pageMetadata.nl;

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${BASE_URL}/${loc}/faq`;
  });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}/faq`,
      siteName: 'BeroepsBelg',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}/faq`,
      languages,
    },
  };
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;
  const t = await getTranslations('faq');
  const faqItems = await getFaqItems();

  // Prepare FAQ data for JSON-LD
  const faqsForSchema = faqItems.map((item) => ({
    question: item.question[locale] || item.question.nl || '',
    answer: item.answer[locale] || item.answer.nl || '',
  }));

  return (
    <>
      {faqsForSchema.length > 0 && <FaqPageJsonLd faqs={faqsForSchema} />}
      <div className="min-h-screen bg-[#F9F9F7] py-20 md:py-32 px-4 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header Section - Editorial Style */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl md:text-7xl lg:text-8xl font-serif text-neutral-900 tracking-tight leading-tight">
            FAQ
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 font-inter max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* FAQ Accordion - Custom Styled */}
        {faqItems.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-4 mb-16">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white rounded-xl border-l-4 border-[#1BDD95] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group"
            >
                <AccordionTrigger className="text-left font-oswald font-semibold text-lg md:text-xl text-neutral-900 hover:no-underline px-6 md:px-8 py-6 hover:text-[#1BDD95] transition-colors [&[data-state=open]]:text-[#1BDD95] [&[data-state=open]>svg]:text-[#1BDD95] [&>svg]:text-[#1BDD95] [&>svg]:h-5 [&>svg]:w-5">
                  <span className="pr-4">{item.question[locale] || item.question.nl || 'Question'}</span>
              </AccordionTrigger>
              <AccordionContent className="text-neutral-700 font-inter text-base leading-relaxed px-6 md:px-8 pb-6 pt-2">
                <div className="border-t border-neutral-100 pt-4">
                    <div className="whitespace-pre-line">
                      {item.answer[locale] || item.answer.nl || 'Answer'}
                    </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        ) : (
          <div className="bg-white rounded-xl border-l-4 border-[#1BDD95] shadow-sm p-8 md:p-12 text-center mb-16">
            <p className="text-lg text-neutral-600 font-inter">
              {t('noFaqItems') || 'No FAQ items available at the moment.'}
            </p>
          </div>
        )}

        {/* Tours CTA - Enhanced Styling */}
        <div className="relative">
          {/* Decorative element */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#1BDD95] rounded-full" />

          <div className="bg-[#1BDD95] rounded-[2.5rem] p-8 md:p-12 text-center shadow-xl">
            <h2 className="text-3xl md:text-5xl font-oswald font-bold text-white uppercase tracking-tight mb-4">
              {t('stillHaveQuestions')}
            </h2>
            <p className="text-lg md:text-xl text-white/90 font-inter mb-8 max-w-2xl mx-auto">
              {t('ctaDescription')}
            </p>
            <a
              href={`/${locale}/tours`}
              className="inline-flex items-center gap-2 bg-white text-[#1BDD95] hover:bg-neutral-100 font-oswald font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 uppercase tracking-wider text-sm md:text-base"
            >
              {t('exploreOurTours')}
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
