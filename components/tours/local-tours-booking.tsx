'use client';

import { useEffect, useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Users, Info, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
  tourLanguages?: string[];
}

export function LocalToursBooking({ tourId, tourTitle, tourPrice, tourDuration = 120, citySlug, tourLanguages }: LocalToursBookingProps) {
  const t = useTranslations('tourDetail');
  const [bookings, setBookings] = useState<LocalTourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<LocalTourBooking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  console.log('LocalToursBooking component rendered:', {
    tourId,
    tourTitle,
    tourPrice,
    tourDuration,
  });

  useEffect(() => {
    async function fetchBookings() {
      console.log('LocalToursBooking: Fetching bookings for tourId:', tourId);
      try {
        const response = await fetch(`/api/local-tours-bookings?tourId=${tourId}`);
        console.log('LocalToursBooking: API response status:', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('LocalToursBooking: Received bookings data:', {
            bookingsCount: data?.length || 0,
            bookings: data,
            isArray: Array.isArray(data),
          });
          setBookings(Array.isArray(data) ? data : []);
          setCurrentMonthIndex(0); // Reset to first month when bookings change
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
        console.log('LocalToursBooking: Loading complete, bookings count:', bookings.length);
      }
    }

    fetchBookings();
  }, [tourId]);

  const formatDate = (dateStr: string) => {
    // Parse date string as local date (YYYY-MM-DD format)
    // Don't use new Date(dateStr) as it interprets as UTC and shifts the day
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Brussels',
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

  // Generate all Saturdays for the next 9 months
  // IMPORTANT: All hooks must be called before any early returns
  const nineMonthsFromNow = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 9);
    return date;
  }, []);

  // Generate all Saturdays for the next 9 months
  const allSaturdays = useMemo(() => {
    const saturdays: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the next Saturday
    const currentDay = today.getDay();
    const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    
    // Generate Saturdays until 9 months from now
    // Don't use toISOString() as it converts to UTC and shifts dates
    const currentSaturday = new Date(nextSaturday);
    while (currentSaturday <= nineMonthsFromNow) {
      // Format date as YYYY-MM-DD without timezone conversion
      const year = currentSaturday.getFullYear();
      const month = String(currentSaturday.getMonth() + 1).padStart(2, '0');
      const day = String(currentSaturday.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      saturdays.push(dateStr);
      currentSaturday.setDate(currentSaturday.getDate() + 7);
    }
    
    return saturdays;
  }, [nineMonthsFromNow]);

  // Filter and prepare existing bookings
  const filteredBookings = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return bookings.filter((booking) => {
      if (!booking.booking_date) return false;
      // Parse date string as local date (YYYY-MM-DD format)
      const dateMatch = booking.booking_date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return false;
      const [year, month, day] = dateMatch[1].split('-').map(Number);
      const bookingDate = new Date(year, month - 1, day);
      return bookingDate >= now && bookingDate <= nineMonthsFromNow;
    });
  }, [bookings, nineMonthsFromNow]);

  // Merge all Saturdays with existing bookings
  const futureBookings = useMemo(() => {
    console.log('LocalToursBooking: Merging bookings:', {
      allSaturdaysCount: allSaturdays.length,
      filteredBookingsCount: filteredBookings.length,
      firstFewSaturdays: allSaturdays.slice(0, 5),
      firstFewBookings: filteredBookings.slice(0, 5).map(b => ({
        date: b.booking_date,
        id: b.id,
        people: b.number_of_people,
      })),
    });

    // Create a map of existing bookings by date for quick lookup
    // Normalize booking dates to YYYY-MM-DD format to ensure matching
    const bookingsMap = new Map<string, LocalTourBooking>();
    filteredBookings.forEach((booking) => {
      // Normalize the booking_date to YYYY-MM-DD format
      let normalizedDate = booking.booking_date;
      if (normalizedDate) {
        // Handle various date formats (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, etc.)
        const dateMatch = normalizedDate.match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          normalizedDate = dateMatch[1];
        } else {
          // Try parsing as Date and reformatting
          const parts = normalizedDate.split('-');
          if (parts.length >= 3) {
            const [year, month, day] = parts.map(Number);
            if (year && month && day) {
              normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }
        }
        console.log(`LocalToursBooking: Normalized booking date: ${booking.booking_date} -> ${normalizedDate}`);
        bookingsMap.set(normalizedDate, booking);
      }
    });

    const result = allSaturdays.map((dateStr) => {
      const existingBooking = bookingsMap.get(dateStr);
      if (existingBooking) {
        console.log(`LocalToursBooking: Found booking for ${dateStr}:`, existingBooking.id);
        return existingBooking;
      }
      // Create a placeholder booking for Saturdays without existing bookings
      return {
        id: `placeholder-${dateStr}`,
        tour_id: tourId,
        booking_date: dateStr,
        booking_time: '14:00:00',
        is_booked: false,
        status: 'available',
        customer_name: undefined,
        customer_email: undefined,
        customer_phone: undefined,
        number_of_people: 0,
        booking_id: undefined,
      } as LocalTourBooking;
    });

    console.log('LocalToursBooking: Future bookings result:', {
      totalCount: result.length,
      withBookings: result.filter(b => !b.id?.startsWith('placeholder-')).length,
      placeholders: result.filter(b => b.id?.startsWith('placeholder-')).length,
    });

    return result;
  }, [allSaturdays, filteredBookings, tourId]);

  // Group bookings by month
  const bookingsByMonth = useMemo(() => {
    const grouped: { [key: string]: LocalTourBooking[] } = {};
    
    futureBookings.forEach((booking) => {
      const date = new Date(booking.booking_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(booking);
    });

    // Sort months chronologically
    return Object.keys(grouped)
      .sort()
      .map((monthKey) => {
        const date = new Date(`${monthKey}-01`);
        const monthLabel = date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
        // Capitalize first letter
        const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        return {
          monthKey,
          monthLabel: capitalizedLabel,
          bookings: grouped[monthKey].sort((a, b) => 
            new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime()
          ),
        };
      });
  }, [futureBookings]);

  // Ensure currentMonthIndex is within bounds
  useEffect(() => {
    if (bookingsByMonth.length > 0 && currentMonthIndex >= bookingsByMonth.length) {
      setCurrentMonthIndex(0);
    }
  }, [bookingsByMonth.length, currentMonthIndex]);

  const currentMonth = bookingsByMonth[currentMonthIndex] || null;
  const canGoPrevious = currentMonthIndex > 0;
  const canGoNext = currentMonthIndex < bookingsByMonth.length - 1;

  // Debug: Log month generation
  useEffect(() => {
    if (bookingsByMonth.length > 0) {
      const currentMonthData = bookingsByMonth[currentMonthIndex] || null;
      console.log('LocalToursBooking: Generated months:', {
        totalMonths: bookingsByMonth.length,
        months: bookingsByMonth.map(m => ({
          label: m.monthLabel,
          bookingCount: m.bookings.length,
          placeholderCount: m.bookings.filter(b => b.id?.startsWith('placeholder-')).length,
          realBookingCount: m.bookings.filter(b => !b.id?.startsWith('placeholder-')).length,
        })),
        currentMonthIndex,
        currentMonth: currentMonthData?.monthLabel,
        currentMonthBookings: currentMonthData?.bookings.length || 0,
      });
    }
  }, [bookingsByMonth, currentMonthIndex]);

  console.log('LocalToursBooking: Render state:', {
    loading,
    bookingsCount: bookings.length,
    bookings,
  });

  if (loading) {
    console.log('LocalToursBooking: Showing loading state');
    return (
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>Loading availability...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    console.log('LocalToursBooking: No bookings found, showing message with retry');
    return (
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <h3 className="text-2xl font-serif font-bold text-navy mb-6 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" style={{ color: 'var(--brass)' }} />
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
                console.log('LocalToursBooking: Retry fetched data:', data);
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

  const handlePreviousMonth = () => {
    if (canGoPrevious) {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
  };

  console.log('LocalToursBooking: Filtered future bookings:', {
    totalBookings: bookings.length,
    futureBookingsCount: futureBookings.length,
    bookingsByMonth: bookingsByMonth.length,
    currentMonthIndex,
  });

  if (futureBookings.length === 0) {
    console.log('LocalToursBooking: No future bookings, showing message');
    return (
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>
          Geen toekomstige boekingen beschikbaar.
        </p>
      </div>
    );
  }

  if (bookingsByMonth.length === 0) {
    return (
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <p className="text-sm" style={{ color: 'var(--slate-blue)' }}>
          Geen boekingen beschikbaar voor de komende 9 maanden.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-12 rounded-lg bg-sand p-8 brass-corner">
        <h3 className="text-2xl font-serif font-bold text-navy mb-6 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" style={{ color: 'var(--brass)' }} />
          Local Stories - Zaterdag 14:00
        </h3>
        
        <p className="text-sm mb-6" style={{ color: 'var(--slate-blue)' }}>
          Deze tour vindt plaats elke zaterdag om 14:00. Sluit je aan bij de groep!
        </p>

        {/* Info box about minimum participants */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">{t('localStoriesInfoTitle')}</p>
              <p className="text-sm text-blue-800 mt-1">{t('localStoriesInfoText')}</p>
            </div>
          </div>
        </div>

        {/* Month carousel */}
        <div className="space-y-4">
          {/* Month navigation header */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousMonth}
              disabled={!canGoPrevious}
              className="flex items-center gap-2 border-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--brass)', color: 'var(--belgian-navy)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h4 className="text-lg font-semibold text-navy">
              {currentMonth?.monthLabel || ''}
            </h4>
            
            <Button
              variant="outline"
              onClick={handleNextMonth}
              disabled={!canGoNext}
              className="flex items-center gap-2 border-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--brass)', color: 'var(--belgian-navy)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month indicator dots */}
          {bookingsByMonth.length > 1 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {bookingsByMonth.map((month, index) => (
                <button
                  key={month.monthKey}
                  onClick={() => setCurrentMonthIndex(index)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    index === currentMonthIndex
                      ? 'w-8 bg-brass'
                      : 'w-2 bg-brass/30 hover:bg-brass/50'
                  }`}
                  aria-label={`Go to ${month.monthLabel}`}
                  title={month.monthLabel}
                />
              ))}
            </div>
          )}

          {/* Bookings for current month */}
          {currentMonth && (
            <div className="space-y-3">
              {currentMonth.bookings.map((booking) => {
                const numberOfPeople = booking.number_of_people || 0;

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
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" style={{ color: 'var(--slate-blue)' }} />
                        {numberOfPeople >= 5 ? (
                          <>
                            <Badge variant="outline" className="border-brass text-navy">
                              {numberOfPeople} {numberOfPeople === 1 ? 'persoon' : 'personen'}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--mint)' }}>
                              <Check className="h-4 w-4" />
                              <span>{t('tourConfirmed')}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm font-medium text-blue-600">
                            {numberOfPeople}/5
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinClick(booking)}
                      style={{ backgroundColor: 'rgb(26, 216, 138)', color: 'white' }}
                      className="ml-4 font-semibold hover:opacity-90"
                    >
                      {t('joinTour')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {currentMonth && currentMonth.bookings.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--slate-blue)' }}>
              Geen boekingen beschikbaar voor deze maand.
            </p>
          )}
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
          existingTourBookingId={selectedBooking.booking_id || undefined}
          citySlug={citySlug}
          tourLanguages={tourLanguages}
        />
      )}
    </>
  );
}

