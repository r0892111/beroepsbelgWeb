'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/auth-context';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface TourBookingDialogProps {
  tourId: string;
  tourTitle: string;
  tourPrice: number;
  tourDuration?: number; // Duration in minutes
  isLocalStories?: boolean; // If true, only show 14:00-16:00 timeslot
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TourBookingDialog({
  tourId,
  tourTitle,
  tourPrice,
  tourDuration = 120, // Default 2 hours
  isLocalStories = false,
  open,
  onOpenChange,
}: TourBookingDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('booking');
  const tB2b = useTranslations('b2b');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    bookingDate: undefined as Date | undefined,
    numberOfPeople: 1,
    language: 'nl',
    specialRequests: '',
    requestTanguy: false,
  });

  // Generate time slots between 10:00 and 18:00 based on tour duration
  // For Local Stories tours, only show 14:00-16:00 timeslot
  const timeSlots = useMemo(() => {
    const slots: { value: string; label: string }[] = [];

    // If this is a Local Stories tour, only show 14:00-16:00 slot
    if (isLocalStories) {
      slots.push({
        value: '14:00',
        label: '14:00 - 16:00'
      });
      return slots;
    }

    // Otherwise, generate regular time slots
    const durationMinutes = tourDuration;
    const startHour = 10; // 10:00
    const endHour = 18; // 18:00

    let currentMinutes = startHour * 60;
    const endMinutes = endHour * 60;

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    while (currentMinutes + durationMinutes <= endMinutes) {
      const startTime = formatTime(currentMinutes);
      const endTime = formatTime(currentMinutes + durationMinutes);
      slots.push({
        value: startTime,
        label: `${startTime} - ${endTime}`
      });
      currentMinutes += durationMinutes;
    }

    return slots;
  }, [tourDuration, isLocalStories]);

  // Format duration for display
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}u ${mins}min`;
    if (hours > 0) return `${hours} uur`;
    return `${mins} min`;
  };

  // Form validation
  const [showValidation, setShowValidation] = useState(false);
  const isDateValid = !!formData.bookingDate;
  const isTimeValid = !!selectedTimeSlot;
  const isFormValid = isDateValid && isTimeValid && formData.customerName && formData.customerEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    
    if (!isDateValid || !isTimeValid) {
      setError(!isDateValid ? t('selectBookingDate') : 'Selecteer een tijdslot');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          tourId,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone,
          bookingDate: formData.bookingDate ? format(formData.bookingDate, 'yyyy-MM-dd') : '',
          bookingTime: selectedTimeSlot,
          numberOfPeople: formData.numberOfPeople,
          language: formData.language,
          specialRequests: formData.specialRequests,
          requestTanguy: formData.requestTanguy,
          userId: user?.id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error('No checkout URL received');
      }

      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const totalPrice = tourPrice * formData.numberOfPeople;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {tourTitle} - €{tourPrice.toFixed(2)} {t('perPerson')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('fullName')} *</Label>
            <Input
              id="name"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('email')} *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              placeholder="+32 XXX XX XX XX"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {t('tourDate')} *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-10 justify-start text-left font-normal',
                      !formData.bookingDate && 'text-muted-foreground',
                      showValidation && !isDateValid && 'border-red-500 ring-1 ring-red-500'
                    )}
                  >
                    {formData.bookingDate ? format(formData.bookingDate, 'PP') : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.bookingDate}
                    onSelect={(date) => {
                      setFormData({ ...formData, bookingDate: date });
                      setSelectedTimeSlot(''); // Reset time slot when date changes
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {showValidation && !isDateValid && (
                <p className="text-xs text-red-500">Selecteer een datum</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Tijdslot *
              </Label>
              <Select 
                value={selectedTimeSlot} 
                onValueChange={setSelectedTimeSlot}
                disabled={!formData.bookingDate}
              >
                <SelectTrigger className={cn(
                  "h-10",
                  showValidation && !isTimeValid && formData.bookingDate && 'border-red-500 ring-1 ring-red-500'
                )}>
                  <SelectValue placeholder={formData.bookingDate ? "Kies tijd" : "Kies eerst datum"} />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showValidation && !isTimeValid && formData.bookingDate && (
                <p className="text-xs text-red-500">Selecteer een tijdslot</p>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground -mt-2">
            Tourduur: {formatDuration(tourDuration)}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="people">{t('numberOfPeople')} *</Label>
              <Input
                id="people"
                type="number"
                min="1"
                max="50"
                required
                value={formData.numberOfPeople}
                onChange={(e) => setFormData({ ...formData, numberOfPeople: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">{t('language')} *</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">{tB2b('languages.nl')}</SelectItem>
                  <SelectItem value="en">{tB2b('languages.en')}</SelectItem>
                  <SelectItem value="fr">{tB2b('languages.fr')}</SelectItem>
                  <SelectItem value="de">{tB2b('languages.de')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Request Tanguy Ottomer Section */}
          <div className="rounded-lg border-2 p-4 transition-all hover:border-brass" style={{ borderColor: formData.requestTanguy ? 'var(--brass)' : '#e5e7eb' }}>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded">
                <Image
                  src="/headshot_tanguy.jpg"
                  alt="Tanguy Ottomer"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="requestTanguy"
                    checked={formData.requestTanguy}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, requestTanguy: checked === true })
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="requestTanguy"
                      className="cursor-pointer text-base font-semibold text-navy"
                    >
                      {t('requestTanguy')}
                    </Label>
                    <p className="mt-1 text-sm text-slate-blue">
                      {t('requestTanguyDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requests">{t('specialRequests')}</Label>
            <Textarea
              id="requests"
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              placeholder={t('specialRequestsPlaceholder')}
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              <div className="text-lg font-bold">
                {t('total')}: €{totalPrice.toFixed(2)}
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  t('proceedToPayment')
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
