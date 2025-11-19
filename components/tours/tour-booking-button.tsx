'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TourBookingDialog } from './tour-booking-dialog';

interface TourBookingButtonProps {
  tourId: string;
  tourTitle: string;
  tourPrice: number;
}

export function TourBookingButton({ tourId, tourTitle, tourPrice }: TourBookingButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        className="btn-primary px-8 py-6 text-lg font-semibold"
        onClick={() => setDialogOpen(true)}
      >
        Book this Tour
      </Button>
      <TourBookingDialog
        tourId={tourId}
        tourTitle={tourTitle}
        tourPrice={tourPrice}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
