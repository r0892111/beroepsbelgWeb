'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { CalendarIcon, Clock, Loader2, ShoppingBag, Gift, Plus, Minus, FileText, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/auth-context';
// Removed direct import - will fetch from API instead
import type { Product } from '@/lib/data/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Freight costs constants
const FREIGHT_COST_BE = 7.50;
const FREIGHT_COST_INTERNATIONAL = 14.99;
const FREIGHT_COST_FREE = 0; // Free for tour bookings with upsell products

interface TourBookingDialogProps {
  tourId: string;
  tourTitle: string;
  tourPrice: number;
  tourDuration?: number; // Duration in minutes
  isLocalStories?: boolean; // If true, only show 14:00-16:00 timeslot
  opMaat?: boolean; // If true, this is a custom/on-demand tour
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBookingDate?: string; // Pre-fill booking date (for local stories)
  existingTourBookingId?: number; // Existing tourbooking ID (for local stories - to join existing booking)
  citySlug?: string; // City slug for the tour
}

export function TourBookingDialog({
  tourId,
  tourTitle,
  tourPrice,
  tourDuration = 120, // Default 2 hours
  isLocalStories = false,
  opMaat = false,
  open,
  onOpenChange,
  defaultBookingDate,
  existingTourBookingId,
  citySlug,
}: TourBookingDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('booking');
  const tB2b = useTranslations('b2b');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedUpsell, setSelectedUpsell] = useState<Record<string, number>>({});
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showOpMaatDialog, setShowOpMaatDialog] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [opMaatAnswers, setOpMaatAnswers] = useState({
    startEnd: '',
    cityPart: '',
    subjects: '',
    specialWishes: '',
  });

  const [addressData, setAddressData] = useState({
    fullName: '',
    birthdate: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'België',
  });

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    bookingDate: defaultBookingDate ? new Date(defaultBookingDate) : undefined as Date | undefined,
    numberOfPeople: isLocalStories ? 4 : 15, // Local stories: default to 4 (minimum), Regular tours: default to 15 (1-15 people)
    language: 'nl',
    specialRequests: '',
    requestTanguy: false,
    extraHour: false, // For opMaat tours: add extra hour (3 hours instead of 2)
  });

  const [calendarOpen, setCalendarOpen] = useState(false);

  // Tanguy availability state
  const [tanguyAvailable, setTanguyAvailable] = useState<boolean | null>(null);
  const [checkingTanguyAvailability, setCheckingTanguyAvailability] = useState(false);

  // Update booking date when defaultBookingDate changes
  useEffect(() => {
    if (defaultBookingDate && open) {
      setFormData(prev => ({
        ...prev,
        bookingDate: new Date(defaultBookingDate),
        numberOfPeople: isLocalStories ? 4 : prev.numberOfPeople, // Reset to default for local stories
      }));
      setSelectedTimeSlot('14:00');
    }
  }, [defaultBookingDate, open, isLocalStories]);

  // Reset numberOfPeople when dialog opens for local stories tours
  useEffect(() => {
    if (open && isLocalStories) {
      setFormData(prev => ({
        ...prev,
        numberOfPeople: 4, // Default to 4 for local stories (minimum)
      }));
    }
  }, [open, isLocalStories]);

  // For local stories tours, always set time to 14:00 and prevent changes
  useEffect(() => {
    if (isLocalStories) {
      setSelectedTimeSlot('14:00');
    }
  }, [isLocalStories, open]);

  // Calculate actual duration (accounting for extra hour for opMaat tours)
  const actualDuration = useMemo(() => {
    if (opMaat && formData.extraHour) {
      return 180; // 3 hours
    }
    return tourDuration;
  }, [opMaat, formData.extraHour, tourDuration]);

  // Check Tanguy's availability when date/time changes
  useEffect(() => {
    const checkTanguyAvailability = async () => {
      // Only check for eligible cities and when date/time is selected
      if (
        isLocalStories ||
        !citySlug ||
        !['antwerpen', 'knokke-heist', 'spa'].includes(citySlug.toLowerCase()) ||
        !formData.bookingDate ||
        !selectedTimeSlot
      ) {
        setTanguyAvailable(null);
        // Reset requestTanguy if date/time is not selected
        if (formData.requestTanguy) {
          setFormData(prev => ({ ...prev, requestTanguy: false }));
        }
        return;
      }

      setCheckingTanguyAvailability(true);
      try {
        const dateStr = format(formData.bookingDate, 'yyyy-MM-dd');
        const response = await fetch('/api/check-tanguy-availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: dateStr,
            time: selectedTimeSlot,
            durationMinutes: actualDuration,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setTanguyAvailable(data.available);
          // Reset requestTanguy if he's not available
          if (!data.available && formData.requestTanguy) {
            setFormData(prev => ({ ...prev, requestTanguy: false }));
          }
        } else {
          console.error('Failed to check Tanguy availability');
          setTanguyAvailable(false);
          // Reset requestTanguy on error
          if (formData.requestTanguy) {
            setFormData(prev => ({ ...prev, requestTanguy: false }));
          }
        }
      } catch (error) {
        console.error('Error checking Tanguy availability:', error);
        setTanguyAvailable(false);
        // Reset requestTanguy on error
        if (formData.requestTanguy) {
          setFormData(prev => ({ ...prev, requestTanguy: false }));
        }
      } finally {
        setCheckingTanguyAvailability(false);
      }
    };

    void checkTanguyAvailability();
  }, [formData.bookingDate, selectedTimeSlot, citySlug, isLocalStories, actualDuration]);

  // Log when upsell dialog state changes
  useEffect(() => {
    console.log('Upsell dialog state changed:', showUpsellDialog);
  }, [showUpsellDialog]);

  // Load products for upsell when upsell dialog opens
  useEffect(() => {
    if (showUpsellDialog && products.length === 0) {
      console.log('Loading products for upsell dialog');
      setProductsLoading(true);
      fetch('/api/products')
        .then(res => res.json())
        .then((data: Product[]) => {
          // Only show webshop items (books, merchandise, games) - filter out any non-webshop items
          const webshopItems = data.filter(p =>
            p.category === 'Book' ||
            p.category === 'Merchandise' ||
            p.category === 'Game'
          );
          console.log('Loaded products for upsell:', webshopItems.length);
          setProducts(webshopItems); // Store all products, UI will handle highlighting first 6
        })
        .catch((err) => {
          console.error('Failed to load products for upsell:', err);
        })
        .finally(() => {
          setProductsLoading(false);
        });
    }
  }, [showUpsellDialog, products.length]);

  // Upsell quantity management
  const incrementUpsell = (productId: string) => {
    setSelectedUpsell(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  const decrementUpsell = (productId: string) => {
    setSelectedUpsell(prev => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [productId]: current - 1,
      };
    });
  };

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
    const durationMinutes = actualDuration;
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
  }, [actualDuration, isLocalStories]);

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
  // For local stories, time is always valid (14:00 is set automatically)
  const isTimeValid = isLocalStories ? true : !!selectedTimeSlot;
  const isFormValid = isDateValid && isTimeValid && formData.customerName && formData.customerEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    
    if (!isDateValid || !isTimeValid) {
      setError(!isDateValid ? t('selectBookingDate') : 'Selecteer een tijdslot');
      return;
    }
    
    // Open upsell dialog instead of immediately proceeding to payment
    console.log('Opening upsell dialog, current showUpsellDialog:', showUpsellDialog);
    // Just open the upsell dialog - it will show on top of the main dialog
    setShowUpsellDialog(true);
  };

  const proceedToCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Combine date and time into a single datetime string
      // For op maat tours, also include the selected date/time if provided
      let bookingDateTime = '';
      if (formData.bookingDate) {
        const dateStr = format(formData.bookingDate, 'yyyy-MM-dd');
        const timeStr = opMaat ? (selectedTimeSlot || '14:00') : (isLocalStories ? '14:00' : selectedTimeSlot);
        if (timeStr) {
          bookingDateTime = `${dateStr}T${timeStr}`;
        }
      }

      // Prepare upsell products in standardized format: {id, n: name, p: price, q: quantity}
      // ID is included for database lookups, but not sent to Stripe metadata (to save space)
      // Always send as array (even if empty)
      const upsellProducts = products
        .filter(p => selectedUpsell[p.uuid] && selectedUpsell[p.uuid] > 0)
        .map(p => ({
          id: p.uuid, // Include ID for database lookups
          n: p.title.nl, // name
          p: p.price, // price
          q: selectedUpsell[p.uuid] || 1, // quantity
        }));

      console.log('Sending upsell products to checkout:', {
        count: upsellProducts.length,
        products: upsellProducts
      });

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
          bookingTime: opMaat ? (selectedTimeSlot || '14:00') : (isLocalStories ? '14:00' : selectedTimeSlot),
          bookingDateTime: bookingDateTime, // Combined date and time in ISO format
          numberOfPeople: formData.numberOfPeople,
          language: opMaat ? 'nl' : formData.language,
          specialRequests: opMaat ? '' : formData.specialRequests,
          requestTanguy: isLocalStories ? false : formData.requestTanguy, // Local stories tours always have requestTanguy = false
          userId: user?.id || null,
          citySlug: citySlug || null,
          opMaat: opMaat,
          upsellProducts: upsellProducts, // Include upsell products in checkout session
          // Address data for shipping (only if upsell products are selected)
          shippingAddress: upsellProducts.length > 0 ? {
            fullName: addressData.fullName,
            birthdate: addressData.birthdate,
            street: addressData.street,
            city: addressData.city,
            postalCode: addressData.postalCode,
            country: addressData.country,
          } : null,
          // Op maat specific answers
          opMaatAnswers: opMaat ? {
            startEnd: opMaatAnswers.startEnd,
            cityPart: opMaatAnswers.cityPart,
            subjects: opMaatAnswers.subjects,
            specialWishes: opMaatAnswers.specialWishes,
            extraHour: formData.extraHour,
          } : null,
          durationMinutes: actualDuration, // Include actual duration in booking
          // For local stories: pass existing tourbooking ID if available
          existingTourBookingId: isLocalStories ? (existingTourBookingId || null) : null,
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

      // Close dialogs and redirect to Stripe
      setShowUpsellDialog(false);
      setShowAddressDialog(false);
      setShowOpMaatDialog(false);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      // Keep dialog open so user can see the error
    }
  };

  // Calculate discounted price (10% discount for online bookings)
  const discountRate = 0.9; // 10% discount = 90% of original price
  const discountedTourPrice = tourPrice * discountRate;
  
  // Calculate total price including upsells
  const upsellTotal = products
    .filter(p => selectedUpsell[p.uuid] && selectedUpsell[p.uuid] > 0)
    .reduce((sum, p) => sum + (p.price * (selectedUpsell[p.uuid] || 0)), 0);
  
  // Calculate tour total based on number of people (for all tour types) - using discounted price
  const originalTourTotal = tourPrice * formData.numberOfPeople;
  const tourTotal = discountedTourPrice * formData.numberOfPeople;
  
  // Calculate additional costs
  const tanguyCost = formData.requestTanguy ? 125 : 0;
  const extraHourCost = formData.extraHour ? 150 : 0;
  
  // Shipping is ALWAYS FREE for tour bookings with upsell products
  const hasUpsellProducts = upsellTotal > 0;
  const shippingCost = hasUpsellProducts ? FREIGHT_COST_FREE : 0;
  
  const totalPrice = tourTotal + upsellTotal + tanguyCost + extraHourCost + shippingCost;
  const savings = originalTourTotal - tourTotal;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('Price calculation:', {
      opMaat,
      tourPrice,
      numberOfPeople: formData.numberOfPeople,
      tourTotal,
      upsellTotal,
      totalPrice,
    });
  }

  return (
    <>
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Don't allow closing main dialog if upsell dialog is open
        if (!isOpen && showUpsellDialog) {
          return;
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="flex flex-col gap-1">
            <span>
              {tourTitle} - €{discountedTourPrice.toFixed(2)} {t('perPerson')}
              {tourPrice > discountedTourPrice && (
                <span className="ml-2 text-sm line-through text-muted-foreground">
                  €{tourPrice.toFixed(2)}
                </span>
              )}
            </span>
            {tourPrice > discountedTourPrice && (
              <span className="text-xs text-green-600 font-semibold">
                {t('onlineDiscount')} - {t('youSave')} €{((tourPrice - discountedTourPrice) * formData.numberOfPeople).toFixed(2)} total
              </span>
            )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {t('tourDate')} *
              </Label>
              {isLocalStories ? (
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  <span className="text-muted-foreground">
                    {formData.bookingDate ? format(formData.bookingDate, 'PP') : 'Datum geselecteerd'}
                  </span>
                </div>
              ) : (
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'w-full h-10 justify-start text-left font-normal',
                        !formData.bookingDate && 'text-muted-foreground',
                        showValidation && !isDateValid && 'border-red-500 ring-1 ring-red-500'
                      )}
                      onClick={() => setCalendarOpen(!calendarOpen)}
                    >
                      {formData.bookingDate ? format(formData.bookingDate, 'PP') : t('selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0 z-[100]" 
                    align="start" 
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    side="bottom"
                    sideOffset={4}
                    onEscapeKeyDown={() => setCalendarOpen(false)}
                  >
                    <Calendar
                      mode="single"
                      selected={formData.bookingDate}
                      onSelect={(date: Date | undefined) => {
                        if (date) {
                          setFormData((prev) => ({ ...prev, bookingDate: date }));
                          setSelectedTimeSlot(''); // Reset time slot when date changes
                          setCalendarOpen(false); // Close popover after date selection
                        }
                      }}
                      disabled={(date: Date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        return dateToCheck < today;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
              {showValidation && !isDateValid && !isLocalStories && (
                <p className="text-xs text-red-500">Selecteer een datum</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Tijdslot *
              </Label>
              {isLocalStories ? (
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  <span className="text-muted-foreground">14:00 - 16:00 (Vast)</span>
                </div>
              ) : (
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
              )}
              {showValidation && !isTimeValid && formData.bookingDate && !isLocalStories && (
                <p className="text-xs text-red-500">Selecteer een tijdslot</p>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground -mt-2">
            Tourduur: {formatDuration(actualDuration)}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="people">{t('numberOfPeople')} *</Label>
              <Select
                value={formData.numberOfPeople.toString()}
                onValueChange={(value: string) => {
                  // Parse the value - it represents the maximum number in the range
                  // e.g., "15" means 1-15 people, "30" means 16-30 people, etc.
                  const numValue = parseInt(value, 10);
                  setFormData(prev => ({ ...prev, numberOfPeople: numValue }));
                }}
              >
                <SelectTrigger id="people">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const peopleLabel = formData.language === 'nl' ? 'personen' : 
                                       formData.language === 'en' ? 'people' : 
                                       formData.language === 'fr' ? 'personnes' : 
                                       formData.language === 'de' ? 'Personen' : 'personen';
                    const options = [];
                    
                    if (isLocalStories) {
                      // For local stories tours, start from 1 person (minimum 4 is enforced elsewhere)
                      for (let i = 1; i <= 120; i++) {
                        options.push(
                          <SelectItem key={i} value={i.toString()}>{i} {peopleLabel}</SelectItem>
                        );
                      }
                    } else {
                      // For regular tours, start with "1-15 people" option
                      options.push(
                        <SelectItem key="15" value="15">1-15 {peopleLabel}</SelectItem>
                      );
                      // Add individual options from 16 onwards, counting up by 1
                      for (let i = 16; i <= 120; i++) {
                        options.push(
                          <SelectItem key={i} value={i.toString()}>{i} {peopleLabel}</SelectItem>
                        );
                      }
                    }
                    return options;
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">{t('language')} *</Label>
              <Select
                value={formData.language}
                onValueChange={(value: string) => setFormData({ ...formData, language: value })}
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

          {/* Request Tanguy Ottomer Section - Only shown when available and date/time is selected */}
          {!isLocalStories && 
           citySlug && 
           ['antwerpen', 'knokke-heist', 'spa'].includes(citySlug.toLowerCase()) &&
           formData.bookingDate &&
           selectedTimeSlot &&
           (checkingTanguyAvailability ? (
             <div className="rounded-lg border-2 p-4 border-gray-200">
               <div className="flex items-center gap-4">
                 <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded">
                   <Image
                     src="/headshot_tanguy.jpg"
                     alt="Tanguy Ottomer"
                     fill
                     className="object-cover opacity-50"
                   />
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center gap-2">
                     <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                     <span className="text-sm text-gray-500">Checking availability...</span>
                   </div>
                 </div>
               </div>
             </div>
           ) : tanguyAvailable === true ? (
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
                       <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                         {t('tanguyLanguageDisclaimer')}
                       </p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           ) : tanguyAvailable === false ? (
             <div className="rounded-lg border-2 p-4 border-gray-200 opacity-60">
               <div className="flex items-center gap-4">
                 <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded">
                   <Image
                     src="/headshot_tanguy.jpg"
                     alt="Tanguy Ottomer"
                     fill
                     className="object-cover opacity-50"
                   />
                 </div>
                 <div className="flex-1">
                   <p className="text-sm text-gray-500">
                     Tanguy is not available at the selected time.
                   </p>
                 </div>
               </div>
             </div>
           ) : null
          )}

          {/* Extra Hour Checkbox - Only for opMaat tours */}
          {opMaat && (
            <div className="rounded-lg border-2 p-4 border-gray-200">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="extraHour"
                  checked={formData.extraHour}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, extraHour: checked === true })
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="extraHour"
                    className="cursor-pointer text-base font-semibold text-navy"
                  >
                    {t('addExtraHour')}
                  </Label>
                </div>
              </div>
            </div>
          )}

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
              <div className="flex flex-col gap-1">
                <div className="text-lg font-bold">
                  {t('total')}: €{totalPrice.toFixed(2)}
                  {originalTourTotal > tourTotal && (
                    <span className="text-sm font-normal line-through text-muted-foreground ml-2">
                      €{originalTourTotal.toFixed(2)}
                    </span>
                  )}
                </div>
                {formData.numberOfPeople > 1 && (
                  <div className="text-sm text-muted-foreground">
                    {formData.numberOfPeople} × €{discountedTourPrice.toFixed(2)} {t('perPerson')}
                    {tourPrice > discountedTourPrice && (
                      <span className="line-through ml-1">€{tourPrice.toFixed(2)}</span>
                    )}
                  </div>
                )}
                {upsellTotal > 0 && (
                  <div className="text-sm text-muted-foreground">
                    + €{upsellTotal.toFixed(2)} extras
                  </div>
                )}
                {savings > 0 && (
                  <div className="text-xs text-green-600 font-semibold">
                    {t('youSave')} €{savings.toFixed(2)} ({t('onlineDiscount')})
                  </div>
                )}
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

      {/* Upsell Products Dialog */}
      <Dialog
        open={showUpsellDialog}
        onOpenChange={(isOpen) => {
          console.log('Upsell dialog onOpenChange:', isOpen, 'showUpsellDialog:', showUpsellDialog);
          setShowUpsellDialog(isOpen);
          if (!isOpen) {
            // Reset expanded products view when dialog closes
            setShowAllProducts(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" style={{ zIndex: 60 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}>
                <Gift className="h-5 w-5" />
              </div>
              Voeg een cadeau toe (optioneel)
            </DialogTitle>
            <DialogDescription>
              Boeken, merchandise en spellen voor je tour
            </DialogDescription>
          </DialogHeader>

          {/* Free shipping notice */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-base)]/10 border border-[var(--primary-base)]/20">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--primary-base)' }} />
            <span className="text-sm" style={{ color: 'var(--primary-dark)' }}>
              Gratis verzending bij je tourboeking
            </span>
          </div>

          {productsLoading ? (
            <div className="flex items-center justify-center py-12 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length > 0 ? (
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
              <div className="overflow-y-auto flex-1 pr-2 -mr-2">
                {/* Highlighted products (first 6) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.slice(0, 6).map((product) => {
                  const quantity = selectedUpsell[product.uuid] || 0;
                  const isSelected = quantity > 0;
                  const categoryLabels: Record<string, string> = {
                    'Book': 'Boek',
                    'Merchandise': 'Merchandise',
                    'Game': 'Spel',
                  };

                  return (
                    <div
                      key={product.uuid}
                      className={cn(
                        "p-5 rounded-xl border-2 transition-all flex flex-col h-full",
                        isSelected
                          ? 'border-[var(--primary-base)] bg-[var(--primary-base)]/5 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                      )}
                    >
                      <div className="flex items-start gap-4 mb-4 flex-shrink-0">
                        <div className="relative w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                          {product.image ? (
                            <Image src={product.image} alt={product.title.nl} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base leading-tight mb-2 line-clamp-2">
                            {product.title.nl}
                          </p>
                          <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 mb-2">
                            {categoryLabels[product.category] || product.category}
                          </span>
                          <p className="text-xl font-bold" style={{ color: 'var(--primary-base)' }}>
                            €{product.price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
                        {isSelected ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-muted-foreground">Aantal:</span>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => decrementUpsell(product.uuid)}
                                className="h-9 w-9 p-0 rounded-full"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-lg font-semibold min-w-[2.5rem] text-center">
                                {quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => incrementUpsell(product.uuid)}
                                className="h-9 w-9 p-0 rounded-full"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => incrementUpsell(product.uuid)}
                            className="w-full h-9"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Toevoegen
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* Show more products button & expanded section */}
                {products.length > 6 && (
                  <div className="mt-6">
                    {!showAllProducts ? (
                      <button
                        type="button"
                        onClick={() => setShowAllProducts(true)}
                        className="w-full py-3 text-sm font-medium text-center border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
                        style={{ color: 'var(--primary-dark)' }}
                      >
                        Bekijk meer producten ({products.length - 6} meer)
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Meer producten</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {products.slice(6).map((product) => {
                            const quantity = selectedUpsell[product.uuid] || 0;
                            const isSelected = quantity > 0;
                            const categoryLabels: Record<string, string> = {
                              'Book': 'Boek',
                              'Merchandise': 'Merchandise',
                              'Game': 'Spel',
                            };

                            return (
                              <div
                                key={product.uuid}
                                className={cn(
                                  "p-5 rounded-xl border-2 transition-all flex flex-col h-full",
                                  isSelected
                                    ? 'border-[var(--primary-base)] bg-[var(--primary-base)]/5 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                                )}
                              >
                                <div className="flex items-start gap-4 mb-4 flex-shrink-0">
                                  <div className="relative w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                    {product.image ? (
                                      <Image src={product.image} alt={product.title.nl} fill className="object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-base leading-tight mb-2 line-clamp-2">
                                      {product.title.nl}
                                    </p>
                                    <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 mb-2">
                                      {categoryLabels[product.category] || product.category}
                                    </span>
                                    <p className="text-xl font-bold" style={{ color: 'var(--primary-base)' }}>
                                      €{product.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-200 flex-shrink-0">
                                  {isSelected ? (
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-sm font-medium text-muted-foreground">Aantal:</span>
                                      <div className="flex items-center gap-3">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => decrementUpsell(product.uuid)}
                                          className="h-9 w-9 p-0 rounded-full"
                                        >
                                          <Minus className="h-4 w-4" />
                                        </Button>
                                        <span className="text-lg font-semibold min-w-[2.5rem] text-center">
                                          {quantity}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => incrementUpsell(product.uuid)}
                                          className="h-9 w-9 p-0 rounded-full"
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => incrementUpsell(product.uuid)}
                                      className="w-full h-9"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Toevoegen
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAllProducts(false)}
                          className="w-full mt-4 py-2 text-xs font-medium text-center text-muted-foreground hover:text-gray-700 transition-colors"
                        >
                          Minder tonen
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Fixed summary section - always visible */}
              <div className="flex-shrink-0 pt-4 border-t border-gray-200 bg-white">
                {upsellTotal > 0 && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Extra producten ({Object.values(selectedUpsell).reduce((sum, qty) => sum + qty, 0)}):
                      </span>
                      <span className="text-lg font-bold" style={{ color: 'var(--primary-base)' }}>
                        €{upsellTotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-base font-semibold">Verzendkosten:</span>
                      <span className="text-base font-semibold text-green-600 font-bold">
                        GRATIS
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-base font-semibold">Tour:</span>
                      <span className="text-base font-semibold">€{tourTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-lg font-bold">Totaal:</span>
                      <span className="text-xl font-bold" style={{ color: 'var(--primary-base)' }}>
                        €{totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                {upsellTotal === 0 && (
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-semibold">Tour:</span>
                    <span className="text-base font-semibold">€{tourTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Geen producten beschikbaar
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200 flex-shrink-0">
              {error}
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button
              type="button"
              onClick={() => {
                // Check if upsell products are selected - if yes, show address dialog first
                const hasUpsellProducts = upsellTotal > 0;
                
                if (hasUpsellProducts) {
                  // Show address dialog for shipping
                  setShowUpsellDialog(false);
                  setShowAddressDialog(true);
                } else if (opMaat) {
                  // If op maat tour, show op maat questions dialog first
                  setShowUpsellDialog(false);
                  setShowOpMaatDialog(true);
                } else {
                  // No upsell products, proceed directly to checkout
                  proceedToCheckout();
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  {opMaat ? 'Verder →' : `Doorgaan naar betaling${upsellTotal > 0 ? ` (€${totalPrice.toFixed(2)})` : ''}`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Dialog for Upsell Products */}
      <Dialog 
        open={showAddressDialog} 
        onOpenChange={(isOpen) => {
          setShowAddressDialog(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Verzendgegevens
            </DialogTitle>
            <DialogDescription>
              Vul je gegevens in voor de verzending van je producten
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fullName" className="text-sm font-semibold">
                Volledige naam *
              </Label>
              <Input
                id="fullName"
                value={addressData.fullName}
                onChange={(e) => setAddressData({ ...addressData, fullName: e.target.value })}
                placeholder="Jan Janssen"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="birthdate" className="text-sm font-semibold">
                Geboortedatum *
              </Label>
              <Input
                id="birthdate"
                type="date"
                value={addressData.birthdate}
                onChange={(e) => setAddressData({ ...addressData, birthdate: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="street" className="text-sm font-semibold">
                Straat en huisnummer *
              </Label>
              <Input
                id="street"
                value={addressData.street}
                onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                placeholder="Kerkstraat 123"
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode" className="text-sm font-semibold">
                  Postcode *
                </Label>
                <Input
                  id="postalCode"
                  value={addressData.postalCode}
                  onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                  placeholder="1000"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="city" className="text-sm font-semibold">
                  Stad *
                </Label>
                <Input
                  id="city"
                  value={addressData.city}
                  onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                  placeholder="Brussel"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country" className="text-sm font-semibold">
                Land *
              </Label>
              <Select
                value={addressData.country}
                onValueChange={(value: string) => setAddressData({ ...addressData, country: value })}
                required
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecteer een land" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="België">België</SelectItem>
                  <SelectItem value="Nederland">Nederland</SelectItem>
                  <SelectItem value="Frankrijk">Frankrijk</SelectItem>
                  <SelectItem value="Duitsland">Duitsland</SelectItem>
                  <SelectItem value="Luxemburg">Luxemburg</SelectItem>
                  <SelectItem value="Verenigd Koninkrijk">Verenigd Koninkrijk</SelectItem>
                  <SelectItem value="Spanje">Spanje</SelectItem>
                  <SelectItem value="Italië">Italië</SelectItem>
                  <SelectItem value="Portugal">Portugal</SelectItem>
                  <SelectItem value="Oostenrijk">Oostenrijk</SelectItem>
                  <SelectItem value="Zwitserland">Zwitserland</SelectItem>
                  <SelectItem value="Anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddressDialog(false);
                setShowUpsellDialog(true);
              }}
              className="w-full sm:w-auto"
            >
              Terug
            </Button>
            <Button
              type="button"
              onClick={() => {
                // Validate required fields
                if (!addressData.fullName || !addressData.birthdate || !addressData.street || 
                    !addressData.postalCode || !addressData.city || !addressData.country) {
                  setError('Vul alle verplichte velden in');
                  return;
                }

                setError(null);

                // If op maat tour, show op maat questions dialog next
                if (opMaat) {
                  setShowAddressDialog(false);
                  setShowOpMaatDialog(true);
                } else {
                  // Proceed to checkout with address data
                  proceedToCheckout();
                }
              }}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  {opMaat ? 'Verder →' : `Doorgaan naar betaling (€${totalPrice.toFixed(2)})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Op Maat Questions Dialog */}
      <Dialog 
        open={showOpMaatDialog} 
        onOpenChange={(isOpen) => {
          setShowOpMaatDialog(isOpen);
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" style={{ zIndex: 70 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}>
                <FileText className="h-5 w-5" />
              </div>
              Help ons je perfecte tour samen te stellen
            </DialogTitle>
            <DialogDescription>
              Beantwoord de volgende vragen om je op maat tour te personaliseren
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="startEnd" className="text-base font-semibold mb-2 block">
                Waar wil je starten en eindigen?
              </Label>
              <Textarea
                id="startEnd"
                placeholder="Bijvoorbeeld: Start bij Centraal Station, eindig bij het stadhuis..."
                value={opMaatAnswers.startEnd}
                onChange={(e) => setOpMaatAnswers(prev => ({ ...prev, startEnd: e.target.value }))}
                className="min-h-[100px]"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="cityPart" className="text-base font-semibold mb-2 block">
                Welk deel van de stad wil je beter leren kennen?
              </Label>
              <Textarea
                id="cityPart"
                placeholder="Bijvoorbeeld: De historische binnenstad, de moderne wijk, de markten..."
                value={opMaatAnswers.cityPart}
                onChange={(e) => setOpMaatAnswers(prev => ({ ...prev, cityPart: e.target.value }))}
                className="min-h-[100px]"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="subjects" className="text-base font-semibold mb-2 block">
                Welke onderwerpen wil je in de tour zien?
              </Label>
              <Textarea
                id="subjects"
                placeholder="Bijvoorbeeld: Architectuur, geschiedenis, lokale cultuur, eten en drinken..."
                value={opMaatAnswers.subjects}
                onChange={(e) => setOpMaatAnswers(prev => ({ ...prev, subjects: e.target.value }))}
                className="min-h-[100px]"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="specialWishes" className="text-base font-semibold mb-2 block">
                Zijn er nog speciale wensen?
              </Label>
              <Textarea
                id="specialWishes"
                placeholder="Bijvoorbeeld: Toegankelijkheid, specifieke interesses, voorkeuren..."
                value={opMaatAnswers.specialWishes}
                onChange={(e) => setOpMaatAnswers(prev => ({ ...prev, specialWishes: e.target.value }))}
                className="min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // Check if we came from address dialog (has upsell products)
                const hasUpsellProducts = upsellTotal > 0;
                if (hasUpsellProducts) {
                  setShowOpMaatDialog(false);
                  setShowAddressDialog(true);
                } else {
                  setShowOpMaatDialog(false);
                  setShowUpsellDialog(true);
                }
              }}
              className="w-full sm:w-auto"
            >
              ← Terug
            </Button>
            <Button
              type="button"
              onClick={proceedToCheckout}
              disabled={loading || !opMaatAnswers.startEnd.trim() || !opMaatAnswers.cityPart.trim() || !opMaatAnswers.subjects.trim()}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verwerken...
                </>
              ) : (
                <>
                  Doorgaan naar betaling
                  {upsellTotal > 0 && ` (€${totalPrice.toFixed(2)})`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
