import ChooseGuideClientPage from './client-page';

interface ChooseGuidePageProps {
  params: Promise<{ locale: string; bookingId: string }>;
}

export default async function ChooseGuidePage({ params }: ChooseGuidePageProps) {
  return <ChooseGuideClientPage />;
}

