'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    lecture_language: '',
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

    // Phone is required
    if (!formData.phone.trim()) {
      newErrors.phone = tBooking('phoneRequired');
    }

    // Email is required
    if (!formData.email.trim()) {
      newErrors.email = tBooking('emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = tBooking('emailInvalid');
    }

    // Preferred date is required
    if (!formData.preferred_date) {
      newErrors.preferred_date = tBooking('preferredDateRequired');
    }

    // Number of people is required
    if (!formData.number_of_people) {
      newErrors.number_of_people = tBooking('numberOfPeopleRequired');
    } else if (isNaN(Number(formData.number_of_people)) || Number(formData.number_of_people) < 1) {
      newErrors.number_of_people = tBooking('numberOfPeopleInvalid');
    }

    // Location description is required
    if (!formData.location_description.trim()) {
      newErrors.location_description = tBooking('locationDescriptionRequired');
    }

    // Lecture language is required
    if (!formData.lecture_language) {
      newErrors.lecture_language = tBooking('lectureLanguageRequired');
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
      const bookingData: Omit<LectureBooking, 'id' | 'created_at' | 'updated_at' | 'status'> & { lecture_language: string } = {
        lecture_id: lectureId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        preferred_date: formData.preferred_date || undefined,
        number_of_people: formData.number_of_people ? Number(formData.number_of_people) : undefined,
        location_description: formData.location_description.trim() || undefined,
        needs_room_provided: formData.needs_room_provided,
        lecture_language: formData.lecture_language,
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

      // Send data to n8n webhook
      try {
        await fetch('https://alexfinit.app.n8n.cloud/webhook/ed110816-ae87-4492-a151-6e388301e98d', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...bookingData,
            lecture_title: lectureTitle,
            submitted_at: new Date().toISOString(),
          }),
        });
      } catch (webhookError) {
        // Log webhook error but don't fail the submission
        console.error('Failed to send webhook:', webhookError);
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
        lecture_language: '',
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
                <Label htmlFor="phone">
                  {tBooking('phone')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) setErrors({ ...errors, phone: '' });
                  }}
                  required
                  className="mt-1"
                  placeholder="+32 494 25 41 59"
                />
                {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="email">
                  {tBooking('email')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  required
                  className="mt-1"
                  placeholder="your.email@example.com"
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Preferred Date */}
            <div>
              <Label htmlFor="preferred_date">
                {tBooking('preferredDate')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="preferred_date"
                type="date"
                value={formData.preferred_date}
                onChange={(e) => {
                  setFormData({ ...formData, preferred_date: e.target.value });
                  if (errors.preferred_date) setErrors({ ...errors, preferred_date: '' });
                }}
                required
                className="mt-1"
              />
              {errors.preferred_date && <p className="text-sm text-red-500 mt-1">{errors.preferred_date}</p>}
            </div>

            {/* Number of People */}
            <div>
              <Label htmlFor="number_of_people">
                {tBooking('numberOfPeople')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="number_of_people"
                type="number"
                min="1"
                value={formData.number_of_people}
                onChange={(e) => {
                  setFormData({ ...formData, number_of_people: e.target.value });
                  if (errors.number_of_people) setErrors({ ...errors, number_of_people: '' });
                }}
                required
                className="mt-1"
                placeholder="e.g., 25"
              />
              {errors.number_of_people && <p className="text-sm text-red-500 mt-1">{errors.number_of_people}</p>}
            </div>

            {/* Location Description */}
            <div>
              <Label htmlFor="location_description">
                {tBooking('locationDescription')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="location_description"
                value={formData.location_description}
                onChange={(e) => {
                  setFormData({ ...formData, location_description: e.target.value });
                  if (errors.location_description) setErrors({ ...errors, location_description: '' });
                }}
                required
                rows={4}
                className="mt-1"
                placeholder={tBooking('locationDescription')}
              />
              {errors.location_description && <p className="text-sm text-red-500 mt-1">{errors.location_description}</p>}
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

            {/* Lecture Language */}
            <div>
              <Label htmlFor="lecture_language">
                {tBooking('lectureLanguage')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.lecture_language}
                onValueChange={(value) => {
                  setFormData({ ...formData, lecture_language: value });
                  if (errors.lecture_language) setErrors({ ...errors, lecture_language: '' });
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={tBooking('lectureLanguagePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">{tBooking('languageDutch')}</SelectItem>
                  <SelectItem value="en">{tBooking('languageEnglish')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.lecture_language && <p className="text-sm text-red-500 mt-1">{errors.lecture_language}</p>}
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

