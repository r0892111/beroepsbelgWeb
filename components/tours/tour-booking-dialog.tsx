'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface TourBookingDialogProps {
  tourId: string;
  tourTitle: string;
  tourPrice: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TourBookingDialog({
  tourId,
  tourTitle,
  tourPrice,
  open,
  onOpenChange,
}: TourBookingDialogProps) {
  const router = useRouter();
  const t = useTranslations('booking');
  const tB2b = useTranslations('b2b');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    bookingDate: undefined as Date | undefined,
    numberOfPeople: 1,
    language: 'nl',
    specialRequests: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.bookingDate) {
        throw new Error(t('selectBookingDate'));
      }

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
          bookingDate: format(formData.bookingDate, 'yyyy-MM-dd'),
          numberOfPeople: formData.numberOfPeople,
          language: formData.language,
          specialRequests: formData.specialRequests,
          userId: null,
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
      console.error('Checkout error:', err);
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

          <div className="space-y-2">
            <Label>{t('tourDate')} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.bookingDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.bookingDate ? format(formData.bookingDate, 'PPP') : t('selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.bookingDate}
                  onSelect={(date) => setFormData({ ...formData, bookingDate: date })}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

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
