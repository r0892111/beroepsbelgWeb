import ConfirmGuideClientPage from './client-page';

interface ConfirmGuidePageProps {
  params: Promise<{ locale: string; dealId: string }>;
}

export default async function ConfirmGuidePage({ params }: ConfirmGuidePageProps) {
  return <ConfirmGuideClientPage />;
}

