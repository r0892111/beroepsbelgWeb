import { type Locale } from '@/i18n';
import { getFaqItems } from '@/lib/api/content';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ToursCTABanner } from '@/components/upsells/tours-cta-banner';

interface FaqPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;
  const faqItems = await getFaqItems();
  return (
    <div className="min-h-screen bg-[#F9F9F7] py-16 md:py-24 px-4 md:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-center text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-neutral-900">
          FAQ
        </h1>
        <p className="mb-16 text-center text-lg md:text-xl text-neutral-600 font-inter max-w-2xl mx-auto">
          Frequently Asked Questions
        </p>

        <Accordion type="single" collapsible className="space-y-4">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white rounded-2xl border-0 shadow-md hover:shadow-lg transition-shadow px-6 md:px-8 overflow-hidden"
            >
              <AccordionTrigger className="text-left font-bold font-oswald uppercase tracking-tight text-neutral-900 hover:no-underline py-6 text-base md:text-lg hover:text-[#1BDD95] transition-colors">
                {item.question[locale]}
              </AccordionTrigger>
              <AccordionContent className="text-neutral-600 font-inter pb-6 leading-relaxed">
                {item.answer[locale]}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-16">
          <ToursCTABanner
            locale={locale}
            title="Still Have Questions?"
            description="The best way to learn about Belgium is to experience it firsthand. Book a tour and let our expert guides show you around!"
            ctaText="Explore Our Tours"
          />
        </div>
      </div>
    </div>
  );
}
