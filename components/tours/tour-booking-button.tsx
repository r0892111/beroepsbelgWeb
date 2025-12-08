'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TourBookingDialog } from './tour-booking-dialog';
import { useTranslations } from 'next-intl';

interface TourBookingButtonProps {
  tourId: string;
  tourTitle: string;
  tourPrice: number;
  tourDuration?: number;
  isLocalStories?: boolean;
}

export function TourBookingButton({ tourId, tourTitle, tourPrice, tourDuration, isLocalStories }: TourBookingButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations('booking');

  return (
    <>
      <Button
        size="lg"
        className="btn-primary px-8 py-6 text-lg font-semibold"
        onClick={() => setDialogOpen(true)}
      >
        {t('bookNow')}
      </Button>
      <TourBookingDialog
        tourId={tourId}
        tourTitle={tourTitle}
        tourPrice={tourPrice}
        tourDuration={tourDuration}
        isLocalStories={isLocalStories}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
