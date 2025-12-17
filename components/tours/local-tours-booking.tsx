'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TourBookingDialog } from './tour-booking-dialog';
import type { LocalTourBooking } from '@/lib/api/content';

interface LocalToursBookingProps {
  tourId: string;
  tourTitle: string;
  tourPrice: number;
  tourDuration?: number;
  citySlug: string;
}

export function LocalToursBooking({ tourId, tourTitle, tourPrice, tourDuration = 120, citySlug }: LocalToursBookingProps) {
  const [bookings, setBookings] = useState<LocalTourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<LocalTourBooking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const response = await fetch(`/api/local-tours-bookings?tourId=${tourId}`);
        if (response.ok) {
          const data = await response.json();
          setBookings(Array.isArray(data) ? data : []);
        } else {
          const errorText = await response.text();
          console.error('LocalToursBooking: API error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
          });
          // Still set empty array so component can render
          setBookings([]);
        }
      } catch (error) {
        console.error('LocalToursBooking: Error fetching local tours bookings:', error);
        // Still set empty array so component can render
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [tourId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const handleJoinClick = (booking: LocalTourBooking) => {
    setSelectedBooking(booking);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Refresh bookings when dialog closes (in case a booking was made)
      fetch(`/api/local-tours-bookings?tourId=${tourId}`)
        .then(res => res.json())
        .then(data => setBookings(data))
        .catch(err => console.error('Error refreshing bookings:', err));
    }
  };

  if (loading) {
    return (
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>Loading availability...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <h3 className="text-2xl font-serif font-bold text-navy mb-6 flex items-center gap-2">
          <Calendar className="h-6 w-6" style={{ color: 'var(--brass)' }} />
          Local Stories - Zaterdag 14:00
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--slate-blue)' }}>
          Boekingen worden geladen... Tour ID: {tourId}
        </p>
        <Button
          onClick={() => {
            setLoading(true);
            fetch(`/api/local-tours-bookings?tourId=${tourId}`)
              .then(res => res.json())
              .then(data => {
                setBookings(Array.isArray(data) ? data : []);
                setLoading(false);
              })
              .catch(err => {
                console.error('LocalToursBooking: Retry error:', err);
                setLoading(false);
              });
          }}
          style={{ backgroundColor: 'var(--brass)', color: 'var(--belgian-navy)' }}
        >
          Herlaad boekingen
        </Button>
      </div>
    );
  }

  const futureBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.booking_date);
    const isPast = bookingDate < new Date();
    return !isPast;
  });

  if (futureBookings.length === 0) {
    return (
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>
          Geen toekomstige boekingen beschikbaar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <h3 className="text-2xl font-serif font-bold text-navy mb-6 flex items-center gap-2">
          <Calendar className="h-6 w-6" style={{ color: 'var(--brass)' }} />
          Local Stories - Zaterdag 14:00
        </h3>
        
        <p className="text-sm mb-6" style={{ color: 'var(--slate-blue)' }}>
          Deze tour vindt plaats elke zaterdag om 14:00. Sluit je aan bij de groep!
        </p>

        <div className="space-y-3">
          {futureBookings.slice(0, 4).map((booking) => {
            const numberOfPeople = booking.number_of_people || 0;
            const hasPeople = numberOfPeople > 0;
            const isEmpty = !booking.is_booked || booking.status === 'available';

            return (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/50 border-2"
                style={{ borderColor: 'var(--brass)' }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <Clock className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                  <div className="flex-1">
                    <p className="font-semibold text-navy">{formatDate(booking.booking_date)}</p>
                    <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>14:00</p>
                  </div>
                  {hasPeople && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" style={{ color: 'var(--slate-blue)' }} />
                      <Badge variant="outline" className="border-brass text-navy">
                        {numberOfPeople} {numberOfPeople === 1 ? 'persoon' : 'personen'}
                      </Badge>
                    </div>
                  )}
                  {isEmpty && (
                    <Badge variant="outline" className="border-brass text-navy">
                      Beschikbaar
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => handleJoinClick(booking)}
                  style={{ backgroundColor: 'var(--brass)', color: 'var(--belgian-navy)' }}
                  className="ml-4"
                >
                  Sluit aan
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedBooking && (
        <TourBookingDialog
          tourId={tourId}
          tourTitle={tourTitle}
          tourPrice={tourPrice}
          tourDuration={tourDuration}
          isLocalStories={true}
          open={dialogOpen}
          onOpenChange={handleDialogClose}
          defaultBookingDate={selectedBooking.booking_date}
          citySlug={citySlug}
        />
      )}
    </>
  );
}

