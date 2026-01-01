import { getTranslations } from 'next-intl/server';
import { type Locale } from '@/i18n';

interface DisclaimerPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function DisclaimerPage({ params }: DisclaimerPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'terms' });

  // Helper function to render article content with proper line breaks
  const renderContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4 leading-relaxed text-muted-foreground">
        {paragraph}
      </p>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="prose prose-lg mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold">{t('title')}</h1>
        
        {/* Disclaimer about original language */}
        <div className="mb-8 rounded-lg border-2 border-amber-500/50 bg-amber-50/50 p-4">
          <p className="text-sm font-medium leading-relaxed text-amber-900">
            {t('disclaimer')}
          </p>
        </div>
        
        <p className="mb-8 leading-relaxed text-muted-foreground">{t('intro')}</p>

        {/* General Terms & Conditions Section */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-semibold">{t('general.title')}</h2>
          
          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article1.title')}</h3>
            <div>{renderContent(t('general.article1.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article2.title')}</h3>
            <div>{renderContent(t('general.article2.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article3.title')}</h3>
            <div>{renderContent(t('general.article3.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article4.title')}</h3>
            <div>{renderContent(t('general.article4.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article5.title')}</h3>
            <div>{renderContent(t('general.article5.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article6.title')}</h3>
            <div>{renderContent(t('general.article6.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article7.title')}</h3>
            <div>{renderContent(t('general.article7.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article8.title')}</h3>
            <div>{renderContent(t('general.article8.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article9.title')}</h3>
            <div>{renderContent(t('general.article9.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('general.article10.title')}</h3>
            <div>{renderContent(t('general.article10.content'))}</div>
          </article>
        </section>

        {/* Webshop Terms & Conditions Section */}
        <section className="mb-12">
          <h2 className="mb-6 text-3xl font-semibold">{t('webshop.title')}</h2>
          
          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article1.title')}</h3>
            <div className="whitespace-pre-line leading-relaxed text-muted-foreground">
              {t('webshop.article1.content')}
            </div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article2.title')}</h3>
            <div>{renderContent(t('webshop.article2.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article3.title')}</h3>
            <div>{renderContent(t('webshop.article3.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article4.title')}</h3>
            <div>{renderContent(t('webshop.article4.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article5.title')}</h3>
            <div>{renderContent(t('webshop.article5.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article6.title')}</h3>
            <div>{renderContent(t('webshop.article6.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article7.title')}</h3>
            <div>{renderContent(t('webshop.article7.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article8.title')}</h3>
            <div>{renderContent(t('webshop.article8.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article9.title')}</h3>
            <div>{renderContent(t('webshop.article9.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article10.title')}</h3>
            <div>{renderContent(t('webshop.article10.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article11.title')}</h3>
            <div>{renderContent(t('webshop.article11.content'))}</div>
          </article>

          <article className="mb-8">
            <h3 className="mb-4 text-xl font-semibold">{t('webshop.article12.title')}</h3>
            <div>{renderContent(t('webshop.article12.content'))}</div>
          </article>
        </section>
      </div>
    </div>
  );
}
