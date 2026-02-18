'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveDialog, 
  ResponsiveDialogHeader, 
  ResponsiveDialogTitle, 
  ResponsiveDialogDescription, 
  ResponsiveDialogFooter 
} from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Clock, Loader2, ShoppingBag, Gift, Plus, Minus, FileText, CheckCircle2, X, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { isWeekendBrussels } from '@/lib/utils/timezone';
import { useAuth } from '@/lib/contexts/auth-context';
import { useIsMobile } from '@/lib/hooks/use-media-query';
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
  tourLanguages?: string[]; // Available languages for this tour (from admin panel)
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
  tourLanguages,
}: TourBookingDialogProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'nl';
  const { user } = useAuth();
  const t = useTranslations('booking');
  const tB2b = useTranslations('b2b');
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedUpsell, setSelectedUpsell] = useState<Record<string, number>>({});
  const [showUpsellDialog, setShowUpsellDialog] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  
  // Gift card redemption state
  const [giftCardCode, setGiftCardCode] = useState('');
  const [appliedGiftCard, setAppliedGiftCard] = useState<{
    code: string;
    currentBalance: number;
    amountApplied: number;
  } | null>(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);

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
    contactLanguage: locale, // Default to current site locale for email communications
    bookingDate: defaultBookingDate ? new Date(defaultBookingDate) : undefined as Date | undefined,
    numberOfPeople: isLocalStories ? 4 : 15, // Local stories: default to 4 (minimum), Regular tours: default to 15 (1-15 people)
    language: 'Nederlands',
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

  // Set default language to first available when tourLanguages is provided
  useEffect(() => {
    if (open && tourLanguages && tourLanguages.length > 0) {
      // Check if current language is in the available languages
      const isCurrentLanguageAvailable = tourLanguages.includes(formData.language);

      // If current language is not available, set to first available
      if (!isCurrentLanguageAvailable) {
        setFormData(prev => ({ ...prev, language: tourLanguages[0] }));
      }
    }
  }, [open, tourLanguages]);

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
          // Failed to check Tanguy availability
          setTanguyAvailable(false);
          // Reset requestTanguy on error
          if (formData.requestTanguy) {
            setFormData(prev => ({ ...prev, requestTanguy: false }));
          }
        }
      } catch (error) {
        // Error checking Tanguy availability
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
      // Loading products for upsell dialog
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
          // Loaded products for upsell
          setProducts(webshopItems); // Store all products, UI will handle highlighting first 6
        })
        .catch((err) => {
          // Failed to load products for upsell
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

  // Generate time slots based on tour type:
  // - Local Stories tours: only show 14:00-16:00 timeslot
  // - Op Maat tours: 30-minute intervals from 09:00 to 20:00
  // - Regular tours: slots based on tour duration from 10:00 to 18:00
  const timeSlots = useMemo(() => {
    const slots: { value: string; label: string }[] = [];

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // If this is a Local Stories tour, only show 14:00-16:00 slot
    if (isLocalStories) {
      slots.push({
        value: '14:00',
        label: '14:00 - 16:00'
      });
      return slots;
    }

    // Op Maat tours: 30-minute intervals from 09:00 to 20:00 (START times)
    // Tours can START at 20:00 and end later (e.g., 22:00 or 23:00 with extra hour)
    if (opMaat) {
      const startHour = 9; // 09:00
      const lastStartHour = 20; // Last START time is 20:00
      const intervalMinutes = 30; // 30-minute intervals
      const durationMinutes = actualDuration;

      let currentMinutes = startHour * 60;
      const lastStartMinutes = lastStartHour * 60;

      while (currentMinutes <= lastStartMinutes) {
        const startTime = formatTime(currentMinutes);
        const endTime = formatTime(currentMinutes + durationMinutes);
        slots.push({
          value: startTime,
          label: `${startTime} - ${endTime}`
        });
        currentMinutes += intervalMinutes;
      }

      return slots;
    }

    // Regular tours: generate slots based on tour duration
    const durationMinutes = actualDuration;
    const startHour = 10; // 10:00
    const endHour = 18; // 18:00

    let currentMinutes = startHour * 60;
    const endMinutes = endHour * 60;

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
  }, [actualDuration, isLocalStories, opMaat]);

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    const hours = minutes / 60;
    // Remove trailing .0 for whole hours
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
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
    
    // Load products first to check if any are available
    if (products.length === 0) {
      setProductsLoading(true);
      try {
        const res = await fetch('/api/products');
        const data: Product[] = await res.json();
        const webshopItems = data.filter(p =>
          p.category === 'Book' ||
          p.category === 'Merchandise' ||
          p.category === 'Game'
        );
        setProducts(webshopItems);
        setProductsLoading(false);
        
        // If products are available, show upsell dialog first
        // Otherwise, proceed directly to checkout (no address needed if no upsell items)
        if (webshopItems.length > 0) {
          console.log('Opening upsell dialog, current showUpsellDialog:', showUpsellDialog);
          setShowUpsellDialog(true);
        } else {
          // No products available, proceed directly to checkout (no address needed)
          void proceedToCheckout();
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setProductsLoading(false);
        // On error, proceed directly to checkout (no address needed)
        void proceedToCheckout();
      }
    } else {
      // Products already loaded, show upsell dialog
      console.log('Opening upsell dialog, current showUpsellDialog:', showUpsellDialog);
      setShowUpsellDialog(true);
    }
  };

  const proceedToCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
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

      // Check if upsell products are selected
      const hasUpsellProducts = upsellProducts.length > 0;
      
      // Only validate shipping address if upsell products are selected
      if (hasUpsellProducts) {
        if (!addressData.fullName || !addressData.street || !addressData.city || 
            !addressData.postalCode || !addressData.country) {
          setError('Vul alle verplichte verzendgegevens in');
          setLoading(false);
          setShowAddressDialog(true);
          return;
        }
      }

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
          contactLanguage: formData.contactLanguage, // Language for email communications
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
          locale: locale, // Pass locale for correct redirect after payment
          upsellProducts: upsellProducts, // Include upsell products in checkout session
          // Address data for shipping (only required if upsell products are selected)
          shippingAddress: hasUpsellProducts ? {
            fullName: addressData.fullName,
            birthdate: addressData.birthdate,
            street: addressData.street,
            city: addressData.city,
            postalCode: addressData.postalCode,
            country: addressData.country,
          } : null,
          // Op maat personalization - NOT collected during checkout
          // User fills out form later via email link to /op-maat-form page
          opMaatAnswers: null,
          durationMinutes: actualDuration, // Include actual duration in booking
          extraHour: opMaat ? formData.extraHour : false, // Pass extra hour flag for opMaat tours
          // For local stories: pass existing tourbooking ID if available
          existingTourBookingId: isLocalStories ? (existingTourBookingId || null) : null,
          // Weekend and evening fees
          weekendFee: weekendFeeCost > 0,
          eveningFee: eveningFeeCost > 0,
          // Gift card code for redemption
          giftCardCode: appliedGiftCard?.code || null,
          giftCardDiscount: appliedGiftCard ? giftCardDiscount : 0, // Include discount amount to apply in Stripe
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
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      // Keep dialog open so user can see the error
    }
  };

  // Use base price (no discount)
  const discountedTourPrice = tourPrice;

  // Calculate total price including upsells
  const upsellTotal = products
    .filter(p => selectedUpsell[p.uuid] && selectedUpsell[p.uuid] > 0)
    .reduce((sum, p) => sum + (p.price * (selectedUpsell[p.uuid] || 0)), 0);

  // Calculate tour total based on number of people (for all tour types)
  // IMPORTANT: Use Math.round to match Stripe's cent-based rounding (avoids 1 cent discrepancies)
  const tourTotal = Math.round(discountedTourPrice * formData.numberOfPeople * 100) / 100;
  
  // Calculate additional costs
  const tanguyCost = formData.requestTanguy ? 125 : 0;
  const extraHourCost = formData.extraHour ? 150 : 0;

  // Evening fee for op_maat tours: €25 if time is after 17:00
  const isEveningSlot = selectedTimeSlot && parseInt(selectedTimeSlot.split(':')[0], 10) >= 17;
  const eveningFeeCost = opMaat && isEveningSlot ? 25 : 0;

  // Weekend fee for tours (except local_stories): €25 if date is Saturday or Sunday in Brussels timezone
  const isWeekend = formData.bookingDate ? isWeekendBrussels(formData.bookingDate) : false;
  const weekendFeeCost = isWeekend && !isLocalStories ? 25 : 0;

  // Shipping is ALWAYS FREE for tour bookings with upsell products
  const hasUpsellProducts = upsellTotal > 0;
  const shippingCost = hasUpsellProducts ? FREIGHT_COST_FREE : 0;

  // Calculate gift card discount
  const giftCardDiscount = appliedGiftCard ? Math.min(appliedGiftCard.amountApplied, tourTotal + upsellTotal + tanguyCost + extraHourCost + eveningFeeCost + weekendFeeCost + shippingCost) : 0;
  
  const totalPrice = Math.max(0, tourTotal + upsellTotal + tanguyCost + extraHourCost + eveningFeeCost + weekendFeeCost + shippingCost - giftCardDiscount);

  // Handle gift card application
  const handleApplyGiftCard = async () => {
    if (!giftCardCode.trim()) return;
    
    setGiftCardLoading(true);
    setGiftCardError(null);
    
    try {
      const response = await fetch('/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardCode.trim().toUpperCase() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setGiftCardError(data.error || 'Invalid gift card code');
        return;
      }
      
      const orderTotal = tourTotal + upsellTotal + tanguyCost + extraHourCost + eveningFeeCost + weekendFeeCost + shippingCost;
      const amountToApply = Math.min(data.giftCard.currentBalance, orderTotal);
      
      setAppliedGiftCard({
        code: data.giftCard.code,
        currentBalance: data.giftCard.currentBalance,
        amountApplied: amountToApply,
      });
      setGiftCardCode('');
    } catch (err) {
      setGiftCardError('Failed to validate gift card');
    } finally {
      setGiftCardLoading(false);
    }
  };

  const handleRemoveGiftCard = () => {
    setAppliedGiftCard(null);
    setGiftCardError(null);
  };
  
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
    <ResponsiveDialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Don't allow closing main dialog if upsell dialog is open
        if (!isOpen && showUpsellDialog) {
          return;
        }
        onOpenChange(isOpen);
      }}
      className="sm:max-w-[500px]"
    >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('title')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {tourTitle} - €{discountedTourPrice.toFixed(2)} {t('perPerson')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

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
            <Label htmlFor="contactLanguage">{t('contactLanguage')} *</Label>
            <Select
              value={formData.contactLanguage}
              onValueChange={(value: string) => setFormData({ ...formData, contactLanguage: value })}
            >
              <SelectTrigger id="contactLanguage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('contactLanguageDescription')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('phone')} *</Label>
            <Input
              id="phone"
              type="tel"
              required
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
              ) : isMobile ? (
                /* Mobile: Button that expands to inline calendar */
                <div className="space-y-2">
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.bookingDate ? format(formData.bookingDate, 'PP') : t('selectDate')}
                  </Button>
                  {calendarOpen && (
                    <div className="rounded-lg border bg-background p-2">
                      <Calendar
                        mode="single"
                        selected={formData.bookingDate}
                        onSelect={(date: Date | undefined) => {
                          if (date) {
                            setFormData((prev) => ({ ...prev, bookingDate: date }));
                            setSelectedTimeSlot(''); // Reset time slot when date changes
                            setCalendarOpen(false); // Close calendar after date selection
                          }
                        }}
                        disabled={(date: Date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          // Minimum booking date is 7 days from today
                          const minDate = new Date(today);
                          minDate.setDate(minDate.getDate() + 7);
                          const dateToCheck = new Date(date);
                          dateToCheck.setHours(0, 0, 0, 0);
                          return dateToCheck < minDate;
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop: Popover calendar */
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen} modal={true}>
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
                        // Minimum booking date is 7 days from today
                        const minDate = new Date(today);
                        minDate.setDate(minDate.getDate() + 7);
                        const dateToCheck = new Date(date);
                        dateToCheck.setHours(0, 0, 0, 0);
                        return dateToCheck < minDate;
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
                  {tourLanguages && tourLanguages.length > 0 ? (
                    // Show only languages configured for this tour
                    tourLanguages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {tB2b(`languageNames.${lang}`, { defaultValue: lang })}
                      </SelectItem>
                    ))
                  ) : (
                    // Fallback: show default 4 languages if no tourLanguages configured
                    <>
                      <SelectItem value="Nederlands">{tB2b('languageNames.Nederlands')}</SelectItem>
                      <SelectItem value="Engels">{tB2b('languageNames.Engels')}</SelectItem>
                      <SelectItem value="Frans">{tB2b('languageNames.Frans')}</SelectItem>
                      <SelectItem value="Duits">{tB2b('languageNames.Duits')}</SelectItem>
                    </>
                  )}
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
                     src="https://rwrfobawfbfsggczofao.supabase.co/storage/v1/object/public/Tour%20Photos/Antwerpen%20op%20Maat/tanguy_headshot.jpg"
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
                     src="https://rwrfobawfbfsggczofao.supabase.co/storage/v1/object/public/Tour%20Photos/Antwerpen%20op%20Maat/tanguy_headshot.jpg"
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
                     src="https://rwrfobawfbfsggczofao.supabase.co/storage/v1/object/public/Tour%20Photos/Antwerpen%20op%20Maat/tanguy_headshot.jpg"
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

          <ResponsiveDialogFooter>
            <div className="flex w-full items-center justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="text-lg font-bold">
                  {t('total')}: €{totalPrice.toFixed(2)}
                </div>
                {formData.numberOfPeople > 1 && (
                  <div className="text-sm text-muted-foreground">
                    {formData.numberOfPeople} × €{discountedTourPrice.toFixed(2)} {t('perPerson')}
                  </div>
                )}
                {formData.requestTanguy && (
                  <div className="text-sm text-muted-foreground">
                    + €125 {t('tanguyFeeLineItem')}
                  </div>
                )}
                {opMaat && formData.extraHour && (
                  <div className="text-sm text-muted-foreground">
                    + €150 {t('extraHourLineItem')}
                  </div>
                )}
                {eveningFeeCost > 0 && (
                  <div className="text-sm text-muted-foreground">
                    + €25 {t('eveningFeeLineItem')}
                  </div>
                )}
                {weekendFeeCost > 0 && (
                  <div className="text-sm text-muted-foreground">
                    + €25 {t('weekendFeeLineItem')}
                  </div>
                )}
                {upsellTotal > 0 && (
                  <div className="text-sm text-muted-foreground">
                    + €{upsellTotal.toFixed(2)} extras
                  </div>
                )}
              </div>
              <Button type="submit" disabled={loading} className="flex-shrink-0">
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
          </ResponsiveDialogFooter>
        </form>
    </ResponsiveDialog>

      {/* Upsell Products Dialog */}
      <ResponsiveDialog
        open={showUpsellDialog}
        onOpenChange={(isOpen) => {
          console.log('Upsell dialog onOpenChange:', isOpen, 'showUpsellDialog:', showUpsellDialog);
          setShowUpsellDialog(isOpen);
          if (!isOpen) {
            // Reset expanded products view when dialog closes
            setShowAllProducts(false);
          }
        }}
        className="sm:max-w-[700px]"
        style={{ zIndex: 60 }}
      >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--primary-base)', color: 'white' }}>
                <Gift className="h-5 w-5" />
              </div>
              Voeg een cadeau toe (optioneel)
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Boeken, merchandise en spellen voor je tour
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {/* Free shipping notice */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary-base)]/10 border border-[var(--primary-base)]/20">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-red-600" />
            <span className="text-sm font-bold text-red-600">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
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
                        "p-4 rounded-xl border-2 transition-all flex flex-col",
                        isSelected
                          ? 'border-[var(--primary-base)] bg-[var(--primary-base)]/5 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                      )}
                    >
                      {/* Product info section - fixed structure */}
                      <div className="flex items-start gap-3 flex-1">
                        {/* Image or Video */}
                        <div className="relative w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                          {product.image && /\.(mp4|webm|mov)$/i.test(product.image) ? (
                            <video
                              src={product.image}
                              autoPlay
                              loop
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                              aria-label={product.title.nl}
                            />
                          ) : product.image ? (
                            <Image src={product.image} alt={product.title.nl} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        {/* Text content */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1">
                            {product.title.nl}
                          </p>
                          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 w-fit mb-1">
                            {categoryLabels[product.category] || product.category}
                          </span>
                          <p className="text-lg font-bold mt-auto" style={{ color: 'var(--primary-base)' }}>
                            €{product.price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Button section - always at bottom */}
                      <div className="pt-3 mt-3 border-t border-gray-200">
                        {isSelected ? (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Aantal:</span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => decrementUpsell(product.uuid)}
                                className="h-8 w-8 p-0 rounded-full"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-base font-semibold min-w-[1.5rem] text-center">
                                {quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => incrementUpsell(product.uuid)}
                                className="h-8 w-8 p-0 rounded-full"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => incrementUpsell(product.uuid)}
                            className="w-full h-8 text-sm"
                          >
                            <Plus className="h-3 w-3 mr-1" />
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
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
                                  "p-4 rounded-xl border-2 transition-all flex flex-col",
                                  isSelected
                                    ? 'border-[var(--primary-base)] bg-[var(--primary-base)]/5 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                                )}
                              >
                                {/* Product info section - fixed structure */}
                                <div className="flex items-start gap-3 flex-1">
                                  {/* Image or Video */}
                                  <div className="relative w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                    {product.image && /\.(mp4|webm|mov)$/i.test(product.image) ? (
                                      <video
                                        src={product.image}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        preload="metadata"
                                        className="w-full h-full object-cover"
                                        aria-label={product.title.nl}
                                      />
                                    ) : product.image ? (
                                      <Image src={product.image} alt={product.title.nl} fill className="object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  {/* Text content */}
                                  <div className="flex-1 min-w-0 flex flex-col">
                                    <p className="font-semibold text-sm leading-tight line-clamp-2 mb-1">
                                      {product.title.nl}
                                    </p>
                                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 w-fit mb-1">
                                      {categoryLabels[product.category] || product.category}
                                    </span>
                                    <p className="text-lg font-bold mt-auto" style={{ color: 'var(--primary-base)' }}>
                                      €{product.price.toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                {/* Button section - always at bottom */}
                                <div className="pt-3 mt-3 border-t border-gray-200">
                                  {isSelected ? (
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-muted-foreground">Aantal:</span>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => decrementUpsell(product.uuid)}
                                          className="h-8 w-8 p-0 rounded-full"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="text-base font-semibold min-w-[1.5rem] text-center">
                                          {quantity}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => incrementUpsell(product.uuid)}
                                          className="h-8 w-8 p-0 rounded-full"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => incrementUpsell(product.uuid)}
                                      className="w-full h-8 text-sm"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
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
                <div className="space-y-2 mb-4">
                  {/* Tour base price */}
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">Tour:</span>
                    <span className="text-base font-semibold">€{tourTotal.toFixed(2)}</span>
                  </div>
                  {/* Tanguy fee */}
                  {tanguyCost > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t('tanguyFeeLineItem')}:</span>
                      <span>€{tanguyCost.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Extra hour fee */}
                  {extraHourCost > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t('extraHourLineItem')}:</span>
                      <span>€{extraHourCost.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Weekend fee */}
                  {weekendFeeCost > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t('weekendFeeLineItem')}:</span>
                      <span>€{weekendFeeCost.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Evening fee */}
                  {eveningFeeCost > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{t('eveningFeeLineItem')}:</span>
                      <span>€{eveningFeeCost.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Upsell products */}
                  {upsellTotal > 0 && (
                    <>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium text-muted-foreground">
                          Extra producten ({Object.values(selectedUpsell).reduce((sum, qty) => sum + qty, 0)}):
                        </span>
                        <span className="text-lg font-bold" style={{ color: 'var(--primary-base)' }}>
                          €{upsellTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold">Verzendkosten:</span>
                        <span className="text-base font-bold text-red-600">
                          GRATIS
                        </span>
                      </div>
                    </>
                  )}
                  {/* Gift Card Redemption */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      {t('haveGiftCard') || 'Have a gift card?'}
                    </Label>
                    
                    {appliedGiftCard ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-xs font-medium text-green-900">
                              {t('giftCardApplied') || 'Gift Card Applied'}
                            </p>
                            <p className="text-xs text-green-700 font-mono">{appliedGiftCard.code}</p>
                            <p className="text-xs text-green-700">
                              -€{appliedGiftCard.amountApplied.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveGiftCard}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="XXXX-XXXX-XXXX-XXXX"
                          value={giftCardCode}
                          onChange={(e) => {
                            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            if (value.length > 4) value = value.slice(0, 4) + '-' + value.slice(4);
                            if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
                            if (value.length > 14) value = value.slice(0, 14) + '-' + value.slice(14);
                            if (value.length > 19) value = value.slice(0, 19);
                            setGiftCardCode(value);
                          }}
                          maxLength={19}
                          className="font-mono text-xs h-8 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && giftCardCode.trim()) {
                              e.preventDefault();
                              void handleApplyGiftCard();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleApplyGiftCard}
                          disabled={giftCardLoading || !giftCardCode.trim()}
                          className="h-8"
                        >
                          {giftCardLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            t('apply') || 'Apply'
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {giftCardError && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {giftCardError}
                      </p>
                    )}
                  </div>
                  {/* Gift Card Discount */}
                  {appliedGiftCard && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Gift className="h-3 w-3" />
                        {t('giftCardDiscount') || 'Gift Card Discount'}
                      </span>
                      <span>-€{giftCardDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Total */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-lg font-bold">Totaal:</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--primary-base)' }}>
                      €{totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
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

          <ResponsiveDialogFooter className="flex-shrink-0">
            <Button
              type="button"
              onClick={() => {
                // Only show address dialog if upsell products are selected
                setShowUpsellDialog(false);
                if (upsellTotal > 0) {
                  setShowAddressDialog(true);
                } else {
                  // No upsell products, proceed directly to checkout
                  void proceedToCheckout();
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
                  {opMaat ? 'Verder →' : `Doorgaan naar betaling${upsellTotal > 0 ? ` (€${totalPrice.toFixed(2)})` : ''}`}
                </>
              )}
            </Button>
          </ResponsiveDialogFooter>
      </ResponsiveDialog>

      {/* Address Dialog - Always Required */}
      <ResponsiveDialog 
        open={showAddressDialog} 
        onOpenChange={(isOpen) => {
          setShowAddressDialog(isOpen);
        }}
        className="sm:max-w-[600px]"
      >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Verzendgegevens
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Vul uw verzendgegevens in (verplicht)
            </ResponsiveDialogDescription>
            <ResponsiveDialogDescription>
              Vul je gegevens in voor de verzending van je producten
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

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

          <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2">
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

                // Proceed to checkout with address data
                // For op maat tours, personalization form will be filled later via email link
                proceedToCheckout();
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
          </ResponsiveDialogFooter>
      </ResponsiveDialog>

      {/* Op Maat personalization form removed - users fill it out after booking via email link */}
    </>
  );
}
