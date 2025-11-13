import AngledSection from '@/components/design-system/AngledSection';
import { type Locale } from '@/i18n';
import { faqItems } from '@/lib/data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FaqPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;
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
      </div>
    </AngledSection>
  );
}
