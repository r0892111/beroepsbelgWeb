'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { LectureBooking } from '@/lib/data/types';

interface LectureBookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lectureId?: string;
  lectureTitle?: string;
}

export function LectureBookingForm({ open, onOpenChange, lectureId, lectureTitle }: LectureBookingFormProps) {
  const t = useTranslations('lecture');
  const tBooking = useTranslations('lecture.booking');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    preferred_date: '',
    number_of_people: '',
    location_description: '',
    needs_room_provided: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = tBooking('nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = tBooking('nameMinLength');
    }

    // At least one of phone or email is required
    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.contact = tBooking('contactRequired');
    }

    // Email format validation if provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = tBooking('emailInvalid');
    }

    // Number of people validation if provided
    if (formData.number_of_people && (isNaN(Number(formData.number_of_people)) || Number(formData.number_of_people) < 1)) {
      newErrors.number_of_people = tBooking('numberOfPeopleInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const bookingData: Omit<LectureBooking, 'id' | 'created_at' | 'updated_at' | 'status'> = {
        lecture_id: lectureId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        preferred_date: formData.preferred_date || undefined,
        number_of_people: formData.number_of_people ? Number(formData.number_of_people) : undefined,
        location_description: formData.location_description.trim() || undefined,
        needs_room_provided: formData.needs_room_provided,
      };

      const response = await fetch('/api/lecture-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit booking');
      }

      toast.success(tBooking('success'));
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        preferred_date: '',
        number_of_people: '',
        location_description: '',
        needs_room_provided: false,
      });
      setErrors({});
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to submit booking:', error);
      toast.error(error.message || 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tBooking('title')}{lectureTitle ? `: ${lectureTitle}` : ''}</DialogTitle>
          <DialogDescription>
            {tBooking('description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <Label htmlFor="name">
                {tBooking('name')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                required
                className="mt-1"
                placeholder={tBooking('name')}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Phone and Email */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">{tBooking('phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.contact) setErrors({ ...errors, contact: '' });
                  }}
                  className="mt-1"
                  placeholder="+32 494 25 41 59"
                />
              </div>
              <div>
                <Label htmlFor="email">{tBooking('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                    if (errors.contact) setErrors({ ...errors, contact: '' });
                  }}
                  className="mt-1"
                  placeholder="your.email@example.com"
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>
            {errors.contact && <p className="text-sm text-red-500">{errors.contact}</p>}

            {/* Preferred Date */}
            <div>
              <Label htmlFor="preferred_date">{tBooking('preferredDate')}</Label>
              <Input
                id="preferred_date"
                type="date"
                value={formData.preferred_date}
                onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Number of People */}
            <div>
              <Label htmlFor="number_of_people">{tBooking('numberOfPeople')}</Label>
              <Input
                id="number_of_people"
                type="number"
                min="1"
                value={formData.number_of_people}
                onChange={(e) => {
                  setFormData({ ...formData, number_of_people: e.target.value });
                  if (errors.number_of_people) setErrors({ ...errors, number_of_people: '' });
                }}
                className="mt-1"
                placeholder="e.g., 25"
              />
              {errors.number_of_people && <p className="text-sm text-red-500 mt-1">{errors.number_of_people}</p>}
            </div>

            {/* Location Description */}
            <div>
              <Label htmlFor="location_description">{tBooking('locationDescription')}</Label>
              <Textarea
                id="location_description"
                value={formData.location_description}
                onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                rows={4}
                className="mt-1"
                placeholder={tBooking('locationDescription')}
              />
            </div>

            {/* Needs Room Provided */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needs_room_provided"
                checked={formData.needs_room_provided}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, needs_room_provided: checked === true })
                }
              />
              <Label
                htmlFor="needs_room_provided"
                className="text-sm font-normal cursor-pointer"
              >
                {tBooking('needsRoom')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {tBooking('cancel')}
            </Button>
            <Button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? tBooking('submitting') : tBooking('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

