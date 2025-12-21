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
import { CalendarIcon, Clock, Loader2, ShoppingBag, Gift, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/contexts/auth-context';
// Removed direct import - will fetch from API instead
import type { Product } from '@/lib/data/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

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

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    bookingDate: defaultBookingDate ? new Date(defaultBookingDate) : undefined as Date | undefined,
    numberOfPeople: 1,
    language: 'nl',
    specialRequests: '',
    requestTanguy: false,
  });

  // Update booking date when defaultBookingDate changes
  useEffect(() => {
    if (defaultBookingDate && open) {
      setFormData(prev => ({
        ...prev,
        bookingDate: new Date(defaultBookingDate),
      }));
      setSelectedTimeSlot('14:00');
    }
  }, [defaultBookingDate, open]);

  // For local stories tours, always set time to 14:00 and prevent changes
  useEffect(() => {
    if (isLocalStories) {
      setSelectedTimeSlot('14:00');
    }
  }, [isLocalStories, open]);

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
          setProducts(webshopItems.slice(0, 6)); // Show up to 6 products for upsell
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

      // Prepare upsell products - always send as array (even if empty)
      const upsellProducts = products
        .filter(p => selectedUpsell[p.uuid] && selectedUpsell[p.uuid] > 0)
        .map(p => ({
          id: p.uuid,
          title: p.title.nl,
          quantity: selectedUpsell[p.uuid] || 1,
          price: p.price,
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

      // Close upsell dialog and redirect to Stripe
      setShowUpsellDialog(false);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      // Keep dialog open so user can see the error
    }
  };

  // Calculate total price including upsells
  const upsellTotal = products
    .filter(p => selectedUpsell[p.uuid] && selectedUpsell[p.uuid] > 0)
    .reduce((sum, p) => sum + (p.price * (selectedUpsell[p.uuid] || 0)), 0);
  
  // Calculate tour total based on number of people (for all tour types)
  const tourTotal = tourPrice * formData.numberOfPeople;
  const totalPrice = tourTotal + upsellTotal;
  
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
              {isLocalStories ? (
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm">
                  <span className="text-muted-foreground">
                    {formData.bookingDate ? format(formData.bookingDate, 'PP') : 'Datum geselecteerd'}
                  </span>
                </div>
              ) : (
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
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 1 : Math.max(1, parseInt(value, 10) || 1);
                  console.log('Number of people changed:', { value, numValue, current: formData.numberOfPeople });
                  setFormData(prev => ({ ...prev, numberOfPeople: numValue }));
                }}
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

          {/* Request Tanguy Ottomer Section - Hidden for local stories tours */}
          {!isLocalStories && (
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
              <div className="text-lg font-bold">
                {t('total')}: €{tourTotal.toFixed(2)}
                {formData.numberOfPeople > 1 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({formData.numberOfPeople} × €{tourPrice.toFixed(2)})
                  </span>
                )}
                {upsellTotal > 0 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    + €{upsellTotal.toFixed(2)} extras = €{totalPrice.toFixed(2)}
                  </span>
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
          if (!isOpen && !loading) {
            // If upsell dialog closes without proceeding, keep main dialog open
            // Main dialog is already open, no need to reopen
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]" style={{ zIndex: 60 }}>
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

          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : products.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((product) => {
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
                        "p-5 rounded-xl border-2 transition-all",
                        isSelected
                          ? 'border-[var(--primary-base)] bg-[var(--primary-base)]/5 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                      )}
                    >
                      <div className="flex items-start gap-4 mb-4">
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
                          <p className="font-semibold text-base leading-tight mb-2">
                            {product.title.nl}
                          </p>
                          <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 mb-2">
                            {categoryLabels[product.category] || product.category}
                          </span>
                          <p className="text-xl font-bold mt-2" style={{ color: 'var(--primary-base)' }}>
                            €{product.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      {isSelected ? (
                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200">
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
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Toevoegen
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {upsellTotal > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Extra producten ({Object.values(selectedUpsell).reduce((sum, qty) => sum + qty, 0)}):
                    </span>
                    <span className="text-lg font-bold" style={{ color: 'var(--primary-base)' }}>
                      €{upsellTotal.toFixed(2)}
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
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Geen producten beschikbaar
            </div>
          )}

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
                setShowUpsellDialog(false);
                setSelectedUpsell({}); // Clear selections if user cancels
                // Reopen main booking dialog if user skips
                setTimeout(() => {
                  onOpenChange(true);
                }, 100);
              }}
              className="w-full sm:w-auto"
            >
              Overslaan
            </Button>
            <Button
              type="button"
              onClick={proceedToCheckout}
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
