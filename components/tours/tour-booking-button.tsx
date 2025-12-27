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
  opMaat?: boolean;
  citySlug?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function TourBookingButton({ tourId, tourTitle, tourPrice, tourDuration, isLocalStories, opMaat, citySlug, size = 'lg', className }: TourBookingButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations('booking');

  const buttonClassName = className || (size === 'lg' ? 'btn-primary px-8 py-6 text-lg font-semibold' : '');
  const buttonStyle = size === 'sm' ? {
    backgroundColor: 'var(--primary-base)',
    color: 'white',
    boxShadow: 'var(--shadow-small)'
  } : undefined;

  return (
    <>
      <Button
        size={size}
        className={buttonClassName}
        style={buttonStyle}
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
        opMaat={opMaat}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        citySlug={citySlug}
      />
    </>
  );
}
