'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import type { LocalTourBooking } from '@/lib/api/content';

interface LocalToursDateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  tourTitle: string;
}

export function LocalToursDateManager({ open, onOpenChange, tourId, tourTitle }: LocalToursDateManagerProps) {
  const [bookings, setBookings] = useState<LocalTourBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (open && tourId) {
      fetchBookings();
    }
  }, [open, tourId]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/local-tours-bookings?tourId=${tourId}`);
      if (response.ok) {
        const data = await response.json();
        setBookings(Array.isArray(data) ? data : []);
      } else {
        toast.error('Failed to load bookings');
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

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
    const nineMonthsFromNow = new Date(today);
    nineMonthsFromNow.setMonth(today.getMonth() + 9);
    
    const currentSaturday = new Date(nextSaturday);
    while (currentSaturday <= nineMonthsFromNow) {
      const year = currentSaturday.getFullYear();
      const month = String(currentSaturday.getMonth() + 1).padStart(2, '0');
      const day = String(currentSaturday.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      saturdays.push(dateStr);
      currentSaturday.setDate(currentSaturday.getDate() + 7);
    }
    
    return saturdays;
  }, []);

  // Create a map of bookings by date
  const bookingsMap = useMemo(() => {
    const map = new Map<string, LocalTourBooking>();
    bookings.forEach((booking) => {
      const dateMatch = booking.booking_date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        map.set(dateMatch[1], booking);
      }
    });
    return map;
  }, [bookings]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Brussels',
    });
  };

  const handleToggleAvailability = async (dateStr: string, currentStatus: string) => {
    setUpdating(dateStr);
    try {
      const newStatus = currentStatus === 'unavailable' ? 'available' : 'unavailable';
      
      // Get the session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      
      const response = await fetch('/api/local-tours-bookings/update-availability', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tourId,
          bookingDate: dateStr,
          status: newStatus,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
        toast.success(
          newStatus === 'unavailable'
            ? 'Date marked as unavailable'
            : 'Date marked as available'
        );
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    } finally {
      setUpdating(null);
    }
  };

  // Group dates by month
  const datesByMonth = useMemo(() => {
    const grouped: { [key: string]: string[] } = {};
    
    allSaturdays.forEach((dateStr) => {
      const [year, month] = dateStr.split('-');
      const monthKey = `${year}-${month}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(dateStr);
    });

    return Object.keys(grouped)
      .sort()
      .map((monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthLabel = date.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
        const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
        return {
          monthKey,
          monthLabel: capitalizedLabel,
          dates: grouped[monthKey],
        };
      });
  }, [allSaturdays]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Manage Dates - {tourTitle}
          </DialogTitle>
          <DialogDescription>
            Mark dates as unavailable to hide them from the store page. Unavailable dates will not be shown to customers.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {datesByMonth.map((month) => (
              <div key={month.monthKey} className="space-y-3">
                <h3 className="text-lg font-semibold text-navy border-b pb-2">
                  {month.monthLabel}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {month.dates.map((dateStr) => {
                    const booking = bookingsMap.get(dateStr);
                    const status = booking?.status || 'available';
                    const isUnavailable = status === 'unavailable';
                    const isUpdating = updating === dateStr;
                    
                    // Check if there are subscriptions (bookings) for this date
                    const hasSubscriptions = (booking?.number_of_people || 0) > 0 || !!booking?.booking_id;

                    return (
                      <div
                        key={dateStr}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          isUnavailable
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-navy">{formatDate(dateStr)}</p>
                          <p className="text-sm text-gray-600">14:00</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUnavailable && (
                            <Badge variant="outline" className="bg-red-100 text-red-900 border-red-300">
                              Unavailable
                            </Badge>
                          )}
                          {!isUnavailable && hasSubscriptions && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-300">
                              {booking?.number_of_people || 0} {booking?.number_of_people === 1 ? 'person' : 'people'}
                            </Badge>
                          )}
                          <Button
                            variant={isUnavailable ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleToggleAvailability(dateStr, status)}
                            disabled={isUpdating}
                            className={isUnavailable ? 'bg-red-600 hover:bg-red-700' : ''}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isUnavailable ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Available
                              </>
                            ) : hasSubscriptions ? (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-1" />
                                Unavailable
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

