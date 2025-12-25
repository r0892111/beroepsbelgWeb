import CompleteTourClientPage from './client-page';

interface CompleteTourPageProps {
  params: Promise<{ locale: string; tourId: string }>;
}

export default async function CompleteTourPage({ params }: CompleteTourPageProps) {
  return <CompleteTourClientPage />;
}

