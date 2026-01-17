import { getTranslations } from 'next-intl/server';
import { type Locale } from '@/i18n';

interface PrivacyPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });

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

        {/* Article 1 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article1.title')}</h2>
          <div>{renderContent(t('article1.content'))}</div>
        </article>

        {/* Article 2 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article2.title')}</h2>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article2.section21.title')}</h3>
            <div>{renderContent(t('article2.section21.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article2.section22.title')}</h3>
            <div>{renderContent(t('article2.section22.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article2.section23.title')}</h3>
            <div>{renderContent(t('article2.section23.content'))}</div>
          </div>
        </article>

        {/* Article 3 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article3.title')}</h2>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article3.section31.title')}</h3>
            <div>{renderContent(t('article3.section31.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article3.section32.title')}</h3>
            <div>{renderContent(t('article3.section32.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article3.section33.title')}</h3>
            <div>{renderContent(t('article3.section33.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article3.section34.title')}</h3>
            <div>{renderContent(t('article3.section34.content'))}</div>
          </div>
        </article>

        {/* Article 4 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article4.title')}</h2>
          <div>{renderContent(t('article4.content'))}</div>
        </article>

        {/* Article 5 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article5.title')}</h2>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section51.title')}</h3>
            <div>{renderContent(t('article5.section51.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section52.title')}</h3>
            <div>{renderContent(t('article5.section52.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section53.title')}</h3>
            <div>{renderContent(t('article5.section53.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section54.title')}</h3>
            <div>{renderContent(t('article5.section54.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section55.title')}</h3>
            <div>{renderContent(t('article5.section55.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section56.title')}</h3>
            <div>{renderContent(t('article5.section56.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section57.title')}</h3>
            <div>{renderContent(t('article5.section57.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article5.section58.title')}</h3>
            <div>{renderContent(t('article5.section58.content'))}</div>
          </div>
        </article>

        {/* Article 6 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article6.title')}</h2>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article6.section61.title')}</h3>
            <div>{renderContent(t('article6.section61.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article6.section62.title')}</h3>
            <div>{renderContent(t('article6.section62.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article6.section63.title')}</h3>
            <div>{renderContent(t('article6.section63.content'))}</div>
          </div>
        </article>

        {/* Article 7 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article7.title')}</h2>
          <div>{renderContent(t('article7.content'))}</div>
        </article>

        {/* Article 8 */}
        <article className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">{t('article8.title')}</h2>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article8.section81.title')}</h3>
            <div>{renderContent(t('article8.section81.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article8.section82.title')}</h3>
            <div>{renderContent(t('article8.section82.content'))}</div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article8.section83.title')}</h3>
            <div className="leading-relaxed text-muted-foreground">
              <div className="mb-4">{renderContent(t('article8.section83.intro'))}</div>

              {/* Functional Cookies */}
              <h4 className="mb-3 mt-6 text-lg font-semibold text-foreground">{t('article8.section83.functional.title')}</h4>
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.name')}</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.origin')}</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.function')}</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.duration')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs">sb-*-auth-token</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.functional.row1.origin')}</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.functional.row1.function')}</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.functional.row1.duration')}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs">NEXT_LOCALE</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.functional.row2.origin')}</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.functional.row2.function')}</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.functional.row2.duration')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Cookies */}
              <h4 className="mb-3 mt-6 text-lg font-semibold text-foreground">{t('article8.section83.payment.title')}</h4>
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.name')}</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.origin')}</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.function')}</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{t('article8.section83.headers.duration')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs">__stripe_mid</td>
                      <td className="border border-gray-300 px-4 py-2">stripe.com</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.payment.row1.function')}</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.payment.row1.duration')}</td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-mono text-xs">__stripe_sid</td>
                      <td className="border border-gray-300 px-4 py-2">stripe.com</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.payment.row2.function')}</td>
                      <td className="border border-gray-300 px-4 py-2">{t('article8.section83.payment.row2.duration')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-xl font-medium">{t('article8.section84.title')}</h3>
            <div>{renderContent(t('article8.section84.content'))}</div>
          </div>
        </article>
      </div>
    </div>
  );
}
