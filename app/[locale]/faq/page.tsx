import AngledSection from '@/components/design-system/AngledSection';
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
  params: { locale: Locale };
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = params;
  const faqItems = await getFaqItems();
  return (
    <AngledSection plane="left">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-12 text-center text-4xl font-bold">FAQ</h1>
        <Accordion type="single" collapsible className="space-y-4">
          {faqItems.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="rounded-lg border border-border px-6">
              <AccordionTrigger className="text-left font-semibold hover:no-underline">
                {item.question[locale]}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
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
    </AngledSection>
  );
}
