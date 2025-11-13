import { type Locale } from '@/i18n';

export default async function ToursLeuvenPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="mb-12 text-center text-4xl font-bold">Tours Leuven</h1>
      <p className="text-center text-muted-foreground">Binnenkort beschikbaar</p>
    </div>
  );
}
