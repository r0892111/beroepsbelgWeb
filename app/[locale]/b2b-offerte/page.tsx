'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Calendar, Users, MapPin, Languages, Building2, Sparkles, CheckCircle2, Home, ShoppingBag, ExternalLink, Clock, Gift, FileText, Loader2, Plus, Minus, AlertCircle } from 'lucide-react';
// Removed direct imports - will fetch from API instead
import type { City, Tour, Product, Lecture } from '@/lib/data/types';
import Image from 'next/image';
import { format } from 'date-fns';
import { useTranslations as useBookingTranslations } from 'next-intl';
import { isValidVATFormat, isValidBelgianVAT, normalizeVATNumber } from '@/lib/utils/vat-validation';
import { isWeekendBrussels } from '@/lib/utils/timezone';

const quoteSchema = z.object({
  dateTime: z.string().min(1),
  city: z.string().min(1),
  tourId: z.string().min(1),
  language: z.string().min(1),
  contactLanguage: z.string().min(1), // Language for email communications
  numberOfPeople: z.string().min(1),
  companyName: z.string().optional(),
  contactFirstName: z.string().min(1),
  contactLastName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  vatNumber: z.string().optional().refine(
    (val) => {
      if (!val) return true;
      // Normalize to check country code
      const normalized = val.trim().replace(/[\s.-]/g, '').toUpperCase();
      // If Belgian VAT, use checksum validation; otherwise use format validation
      if (normalized.startsWith('BE')) {
        // Check format first
        if (!isValidVATFormat(val)) {
          return false;
        }
        // Then check checksum
        return isValidBelgianVAT(val);
      }
      return isValidVATFormat(val);
    },
    (val) => {
      if (!val) return { message: 'Invalid VAT number format. Expected format: BE 0123.456.789 or BE0123456789' };
      const normalized = val.trim().replace(/[\s.-]/g, '').toUpperCase();
      if (normalized.startsWith('BE')) {
        // Check format first
        if (!isValidVATFormat(val)) {
          return { message: 'Invalid Belgian VAT number format. Expected format: BE 0123.456.789 or BE0123456789' };
        }
        // If format is valid but checksum fails
        if (!isValidBelgianVAT(val)) {
          return { message: 'Invalid Belgian VAT number. The checksum is incorrect. Please verify the VAT number.' };
        }
      }
      return { message: 'Invalid VAT number format. Expected format: BE 0123.456.789 or BE0123456789' };
    }
  ),
  billingAddress: z.string().optional(),
  // Business address fields
  street: z.string().optional(),
  streetNumber: z.string().optional(),
  postalCode: z.string().optional(),
  bus: z.string().optional(),
  billingCity: z.string().optional(),
  country: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

export default function B2BQuotePage() {
  const t = useTranslations('b2b');
  const tForms = useTranslations('forms');
  const tCheckout = useTranslations('checkout');
  const tBooking = useBookingTranslations('booking');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  // Helper to get theme text in the correct language
  const getThemeText = (theme: any): string => {
    let themeObj = theme;
    while (typeof themeObj === 'string') {
      try {
        themeObj = JSON.parse(themeObj);
      } catch {
        return themeObj;
      }
    }
    if (!themeObj || typeof themeObj !== 'object') return String(themeObj || '');
    return themeObj[locale] || themeObj.nl || themeObj.en || themeObj.fr || themeObj.de || '';
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'select' | 'contact' | 'upsell' | 'payment' | 'success'>('select');
  const [cities, setCities] = useState<City[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedUpsell, setSelectedUpsell] = useState<Record<string, number>>({});
  const [countdown, setCountdown] = useState(5);
  const [bookingType, setBookingType] = useState<'particulier' | 'zakelijk'>('particulier');
  const [isOpMaat, setIsOpMaat] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [opMaatAnswers, setOpMaatAnswers] = useState({
    startEnd: '',
    cityPart: '',
    subjects: '',
    specialWishes: '',
  });
  const [requestTanguy, setRequestTanguy] = useState(false);
  const [extraHour, setExtraHour] = useState(false); // For opMaat tours: add extra hour (3 hours instead of 2)
  
  // Tanguy availability state
  const [tanguyAvailable, setTanguyAvailable] = useState<boolean | null>(null);
  const [checkingTanguyAvailability, setCheckingTanguyAvailability] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
    trigger,
    setFocus,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      numberOfPeople: '15',
      contactLanguage: locale, // Default to current site locale
    },
  });

  const selectedCity = watch('city');
  const selectedTourId = watch('tourId');
  const numberOfPeople = watch('numberOfPeople');
  const vatNumber = watch('vatNumber') || '';
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const selectedTour = tours.find((tour) => String(tour.id ?? tour.slug) === String(selectedTourId));
  const selectedLecture = selectedTourId?.startsWith('lecture-') 
    ? lectures.find((lecture) => lecture.id === selectedTourId.replace('lecture-', ''))
    : null;

  // Format VAT number as user types (auto-format Belgian VAT: BE 0123.456.789)
  const formatVATInput = (value: string): string => {
    if (!value) return '';
    
    // Remove all non-alphanumeric characters except spaces, dots, and hyphens
    let cleaned = value.replace(/[^A-Za-z0-9\s.-]/g, '');
    
    // Convert to uppercase
    cleaned = cleaned.toUpperCase();
    
    // Extract country code (first 2 letters)
    const countryMatch = cleaned.match(/^([A-Z]{0,2})/);
    const countryCode = countryMatch ? countryMatch[1] : '';
    
    // Extract all digits (after any country code)
    const allDigits = cleaned.replace(/[^0-9]/g, '');
    
    // If it starts with BE (or user is typing BE), format as Belgian VAT: BE 0123.456.789
    if (countryCode === 'BE' || cleaned.startsWith('BE') || (cleaned.length <= 2 && cleaned.toUpperCase().startsWith('B'))) {
      // Limit to 10 digits for Belgian VAT
      const digits = allDigits.slice(0, 10);
      
      // If user is still typing the country code
      if (cleaned.length <= 2 && /^[BE]*$/i.test(cleaned)) {
        return cleaned.toUpperCase();
      }
      
      if (digits.length === 0) {
        return 'BE';
      }
      
      // Format: BE 0123.456.789
      if (digits.length <= 4) {
        return `BE ${digits}`;
      } else if (digits.length <= 7) {
        return `BE ${digits.slice(0, 4)}.${digits.slice(4)}`;
      } else {
        return `BE ${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
      }
    }
    
    // For other countries, allow up to 2 letters + 8-12 alphanumeric
    if (countryCode.length === 2) {
      // After country code, only allow alphanumeric (no spaces/dots)
      const rest = cleaned.slice(2).replace(/[^A-Z0-9]/g, '').slice(0, 12);
      return countryCode + rest;
    }
    
    // If no country code yet, allow letters for country code
    if (cleaned.length <= 2 && /^[A-Z]*$/.test(cleaned)) {
      return cleaned;
    }
    
    // If starts with letters, treat as country code + numbers
    const letterMatch = cleaned.match(/^([A-Z]{0,2})(.*)$/);
    if (letterMatch) {
      const [, letters, rest] = letterMatch;
      const numbers = rest.replace(/[^0-9]/g, '').slice(0, 12);
      return letters + numbers;
    }
    
    return cleaned;
  };

  // Handle VAT input change with auto-formatting
  const handleVATInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPosition = input.selectionStart || 0;
    const oldValue = vatNumber;
    const newValue = e.target.value;
    
    // Format the value
    const formatted = formatVATInput(newValue);
    
    // Calculate new cursor position
    let newCursorPosition = cursorPosition;
    if (formatted !== newValue) {
      // If formatting changed, try to maintain cursor position
      // Count how many formatting characters were added before cursor
      const beforeCursorOld = newValue.substring(0, cursorPosition);
      const beforeCursorNew = formatVATInput(beforeCursorOld);
      newCursorPosition = beforeCursorNew.length;
    }
    
    // Update the value
    setValue('vatNumber', formatted, { shouldValidate: false });
    
    // Restore cursor position after React updates
    requestAnimationFrame(() => {
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    });
    
    // Trigger validation
    trigger('vatNumber');
  };

  // Handle VAT input paste
  const handleVATInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Normalize pasted text (remove all non-alphanumeric except spaces/dots/hyphens)
    const normalized = pastedText.replace(/[^A-Za-z0-9\s.-]/g, '').toUpperCase();
    
    // Format it
    const formatted = formatVATInput(normalized);
    
    // Set the value
    setValue('vatNumber', formatted, { shouldValidate: true });
    trigger('vatNumber');
  };

  // Handle VAT input keydown to prevent invalid characters
  const handleVATInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    const cursorPosition = input.selectionStart || 0;
    
    // Allow control keys (backspace, delete, arrow keys, etc.)
    if (e.ctrlKey || e.metaKey || e.key === 'Backspace' || e.key === 'Delete' || 
        e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'Tab' || e.key === 'Home' || e.key === 'End' || e.key === 'Enter' ||
        e.key === 'Escape') {
      return;
    }
    
    // Allow if it's a valid character
    const char = e.key;
    const isLetter = /[A-Za-z]/.test(char);
    const isDigit = /[0-9]/.test(char);
    const isSpace = char === ' ';
    const isDot = char === '.';
    const isHyphen = char === '-';
    
    if (!isLetter && !isDigit && !isSpace && !isDot && !isHyphen) {
      e.preventDefault();
      return;
    }
    
    // For Belgian VAT (BE), restrict input after country code
    const upperValue = value.toUpperCase();
    if (upperValue.startsWith('BE') || upperValue.startsWith('BE ')) {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      
      // Limit to 10 digits for Belgian VAT
      if (digitsOnly.length >= 10 && isDigit) {
        e.preventDefault();
        return;
      }
      
      // Don't allow letters after BE (except when typing BE itself)
      if (cursorPosition > 2 && isLetter && !(cursorPosition <= 2 && upperValue.length <= 2)) {
        e.preventDefault();
        return;
      }
      
      // Don't allow spaces/dots/hyphens to be typed manually (they're auto-formatted)
      if ((isSpace || isDot || isHyphen) && cursorPosition > 2) {
        e.preventDefault();
        return;
      }
    } else {
      // For non-BE VAT, don't allow spaces/dots/hyphens after country code
      if (upperValue.length >= 2 && (isSpace || isDot || isHyphen)) {
        e.preventDefault();
        return;
      }
    }
  };

  const numPeople = parseInt(numberOfPeople) || 0;

  // Format duration
  const formatDuration = (minutes: number): string => {
    const hours = minutes / 60;
    // Remove trailing .0 for whole hours
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
  };

  // Calculate actual duration (accounting for extra hour for opMaat tours)
  const actualDuration = useMemo(() => {
    const baseDuration = selectedTour?.durationMinutes ?? 120; // Default 2 hours
    if (isOpMaat && extraHour) {
      return baseDuration + 60; // Add 60 minutes (1 hour) to base duration
    }
    return baseDuration;
  }, [isOpMaat, extraHour, selectedTour?.durationMinutes]);

  // Generate time slots based on tour type:
  // - Local Stories tours: only show 14:00-16:00 timeslot
  // - Op Maat tours: 30-minute intervals from 09:00 to 20:00
  // - Regular tours: slots based on tour duration from 10:00 to 18:00
  const timeSlots = useMemo(() => {
    const durationMinutes = actualDuration;
    const slots: { value: string; label: string }[] = [];

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    // Check if this is a "Local Stories" tour - restrict to 14:00-16:00 only
    if (selectedTour?.local_stories === true) {
      return [{
        value: '14:00',
        label: '14:00 - 16:00'
      }];
    }

    // Op Maat tours: 30-minute intervals from 09:00 to 20:00 (START times)
    // Tours can START at 20:00 and end later (e.g., 22:00 or 23:00 with extra hour)
    const tourIsOpMaat = selectedTour?.op_maat === true || 
                        (typeof selectedTour?.op_maat === 'string' && selectedTour.op_maat === 'true') || 
                        (typeof selectedTour?.op_maat === 'number' && selectedTour.op_maat === 1);
    if (tourIsOpMaat) {
      const startHour = 9; // 09:00
      const lastStartHour = 20; // Last START time is 20:00
      const intervalMinutes = 30; // 30-minute intervals

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

    // Regular tours: generate slots based on tour duration from 10:00 to 18:00
    const startHour = 10; // 10:00
    const endHour = 18; // 18:00

    let currentMinutes = startHour * 60; // Start at 10:00 in minutes
    const endMinutes = endHour * 60; // End at 18:00 in minutes

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
  }, [actualDuration, selectedTour?.local_stories, selectedTour?.op_maat]);

  // Check Tanguy's availability when date/time changes
  useEffect(() => {
    const checkTanguyAvailability = async () => {
      // Only check for eligible cities and when date/time is selected
      if (
        !selectedCity ||
        !['antwerpen', 'knokke-heist', 'spa'].includes(selectedCity.toLowerCase()) ||
        !selectedDate ||
        !selectedTimeSlot
      ) {
        setTanguyAvailable(null);
        // Reset requestTanguy if date/time is not selected
        if (requestTanguy) {
          setRequestTanguy(false);
        }
        return;
      }

      setCheckingTanguyAvailability(true);
      try {
        const dateStr = format(new Date(selectedDate), 'yyyy-MM-dd');
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
          if (!data.available && requestTanguy) {
            setRequestTanguy(false);
          }
        } else {
          console.error('Failed to check Tanguy availability');
          setTanguyAvailable(false);
          // Reset requestTanguy on error
          if (requestTanguy) {
            setRequestTanguy(false);
          }
        }
      } catch (error) {
        console.error('Error checking Tanguy availability:', error);
        setTanguyAvailable(false);
        // Reset requestTanguy on error
        if (requestTanguy) {
          setRequestTanguy(false);
        }
      } finally {
        setCheckingTanguyAvailability(false);
      }
    };

    void checkTanguyAvailability();
  }, [selectedDate, selectedTimeSlot, selectedCity, actualDuration]);

  useEffect(() => {
    let isMounted = true;

    async function loadContent() {
      try {
        // Fetch from API routes instead of direct imports
        const [citiesRes, toursRes, lecturesRes, productsRes] = await Promise.all([
          fetch('/api/cities').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/tours').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/lectures').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/products').then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        
        if (!isMounted) return;

        setCities(citiesRes);
        setTours(toursRes);
        setLectures(lecturesRes);
        setProducts(productsRes.slice(0, 6)); // Get 6 products for upsell
        setDataError(null);
      } catch (error) {
        console.error('[B2BQuotePage] Failed to load data', error);
        if (isMounted) {
          setDataError(t('error'));
        }
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    }

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-select city if lectureId is in query params and no city is selected
  useEffect(() => {
    const lectureId = searchParams.get('lectureId');
    if (!lectureId || lectures.length === 0 || cities.length === 0 || selectedCity) return;
    
    const lecture = lectures.find(l => l.id === lectureId);
    if (!lecture) return;

    let cityToSelect = null;
    
    if (lecture.city_id) {
      // Find city by city_id
      cityToSelect = cities.find(c => c.id === lecture.city_id);
    } else if (lecture.city) {
      // Find city by slug
      cityToSelect = cities.find(c => c.slug === lecture.city);
    }
    
    // Fallback to Brussels or first available city if lecture has no city
    if (!cityToSelect) {
      cityToSelect = cities.find(c => c.slug === 'brussel') || cities[0];
    }
    
    if (cityToSelect) {
      setValue('city', cityToSelect.slug, { shouldValidate: false });
    }
  }, [searchParams, lectures, cities, selectedCity, setValue]);

  // Auto-select lecture if lectureId is in query params
  useEffect(() => {
    const lectureId = searchParams.get('lectureId');
    if (!lectureId || lectures.length === 0) return;
    
    const lecture = lectures.find(l => l.id === lectureId);
    if (!lecture) return;

    const expectedLectureValue = `lecture-${lecture.id}`;
    const currentTourId = getValues('tourId');
    
    // Set the lecture if it's not already selected
    // Wait a bit if city was just set to ensure it's available in the dropdown
    if (currentTourId !== expectedLectureValue) {
      // Use setTimeout to ensure city dropdown has updated
      const timeoutId = setTimeout(() => {
        setValue('tourId', expectedLectureValue, { shouldValidate: false });
      }, selectedCity ? 0 : 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, lectures, selectedCity, setValue, getValues]);

  const availableTours = selectedCity
    ? tours.filter((tour) => {
        // Match by cityId (primary method) or city slug (fallback)
        const selectedCityData = cities.find(c => c.slug === selectedCity);
        let matchesCity = false;
        
        if (selectedCityData) {
          // Primary: match by cityId
          if (tour.cityId && tour.cityId === selectedCityData.id) {
            matchesCity = true;
          } else {
            // Fallback: match by city slug
            matchesCity = tour.city === selectedCityData.slug;
          }
        } else {
          // Fallback: match by city slug directly
          matchesCity = tour.city === selectedCity;
        }
        
        return matchesCity && 
          tour.slug !== 'cadeaubon' &&
          tour.local_stories !== true &&
          (tour.local_stories as any) !== 'true' &&
          (tour.local_stories as any) !== 1;
      })
    : [];

  const availableLectures = selectedCity
    ? lectures.filter((lecture) => {
        // Match by cityId (primary method) or city slug (fallback)
        const selectedCityData = cities.find(c => c.slug === selectedCity);
        let matchesCity = false;
        
        if (selectedCityData) {
          // Primary: match by cityId
          if (lecture.city_id && lecture.city_id === selectedCityData.id) {
            matchesCity = true;
          } else if (lecture.city) {
            // Fallback: match by city slug
            matchesCity = lecture.city === selectedCityData.slug;
          }
        } else if (lecture.city) {
          // Fallback: match by city slug directly
          matchesCity = lecture.city === selectedCity;
        }
        
        return matchesCity;
      })
    : [];

  useEffect(() => {
    if (selectedCity) {
      setValue('tourId', '');
      setSelectedDate('');
      setSelectedTimeSlot('');
      setValue('dateTime', '');
    }
  }, [selectedCity, setValue]);

  useEffect(() => {
    if (selectedTourId) {
      setSelectedDate('');
      setSelectedTimeSlot('');
      setValue('dateTime', '');
      setValue('language', ''); // Reset language when tour changes
    }
  }, [selectedTourId, setValue]);

  // Auto-select language if only one is available
  useEffect(() => {
    if (selectedTour && selectedTour.languages.length === 1) {
      setValue('language', selectedTour.languages[0]);
    }
  }, [selectedTour, setValue]);

  // Set isOpMaat when tour is selected
  useEffect(() => {
    if (selectedTour) {
      const tourIsOpMaat = selectedTour?.op_maat === true || 
                          (typeof selectedTour?.op_maat === 'string' && selectedTour.op_maat === 'true') || 
                          (typeof selectedTour?.op_maat === 'number' && selectedTour.op_maat === 1);
      setIsOpMaat(tourIsOpMaat);
    } else {
      setIsOpMaat(false);
    }
  }, [selectedTour]);

  // Combine date + timeslot
  useEffect(() => {
    if (selectedDate && selectedTimeSlot) {
      // Validate that the selected date is at least 1 week from today
      const selectedDateObj = new Date(selectedDate);
      const oneWeekFromToday = new Date();
      oneWeekFromToday.setDate(oneWeekFromToday.getDate() + 7);
      oneWeekFromToday.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      if (selectedDateObj < oneWeekFromToday) {
        // Clear the date if it's less than 1 week away
        setSelectedDate('');
        setValue('dateTime', '');
        toast.error(t('dateMustBeOneWeekAway') || 'De datum moet minimaal 1 week vanaf vandaag zijn');
        return;
      }
      
      const [startHour] = selectedTimeSlot.split(' to ');
      const dateTimeString = `${selectedDate}T${startHour}`;
      setValue('dateTime', dateTimeString);
    }
  }, [selectedDate, selectedTimeSlot, setValue, t]);

  // Reset countdown when entering success step
  useEffect(() => {
    if (step === 'success') {
      setCountdown(5);
    }
  }, [step]);

  // Success countdown redirect
  useEffect(() => {
    if (step === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (step === 'success' && countdown === 0) {
      router.push(`/${locale}`);
    }
  }, [step, countdown, router, locale]);

  const goToContact = () => {
    if (!selectedTour) {
      toast.error(t('selectTour'));
      return;
    }
    if (!selectedDate || !selectedTimeSlot) {
      toast.error(t('selectDateAndTime'));
      return;
    }
    if (!numberOfPeople || parseInt(numberOfPeople) < 15) {
      toast.error(t('fillNumberOfPeople') || 'Minimum aantal personen is 15');
      return;
    }
    // Set op maat state when moving to contact step
    const tourIsOpMaat = selectedTour?.op_maat === true || 
                        (typeof selectedTour?.op_maat === 'string' && selectedTour.op_maat === 'true') || 
                        (typeof selectedTour?.op_maat === 'number' && selectedTour.op_maat === 1);
    setIsOpMaat(tourIsOpMaat);
    setStep('contact');
  };

  const goToUpsell = () => {
    setStep('upsell');
  };

  const goToPayment = () => {
    setStep('payment');
  };

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

  const onSubmit = async (data: QuoteFormData) => {
    // Check for validation errors before submitting
    if (Object.keys(errors).length > 0) {
      // If we're on the payment/confirmation step, scroll to top to show errors
      if (step === 'payment') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      // Trigger validation to show errors
      trigger();
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCityData = cities.find((city) => city.slug === data.city);
      const selectedTourData = tours.find((tour) => String(tour.id) === String(data.tourId));
      // Convert selectedUpsell object to standardized format: {id, n: name, p: price, q: quantity}
      // ID is included for database lookups, but not sent to Stripe metadata (to save space)
      const upsellProducts = Object.entries(selectedUpsell)
        .filter(([_, quantity]) => quantity > 0)
        .map(([productId, quantity]) => {
          const product = products.find(p => p.uuid === productId);
          return product ? {
            id: product.uuid, // Include ID for database lookups
            n: product.title.nl, // name
            p: product.price, // price
            q: quantity, // quantity
          } : null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      // Check if selected tour is op maat
      const tourIsOpMaat = selectedTourData?.op_maat === true || 
                          (typeof selectedTourData?.op_maat === 'string' && selectedTourData.op_maat === 'true') || 
                          (typeof selectedTourData?.op_maat === 'number' && selectedTourData.op_maat === 1);
      
      // Calculate weekend and evening fees
      const isWeekend = selectedDate ? isWeekendBrussels(selectedDate) : false;
      const weekendFee = isWeekend && selectedTourData?.local_stories !== true;
      
      const isEveningSlot = selectedTimeSlot && parseInt(selectedTimeSlot.split(':')[0], 10) >= 17;
      const eveningFee = tourIsOpMaat && isEveningSlot;
      
      // Create tourbooking record for ALL tours (to save upsell products and get booking ID)
      let createdBookingId: number | null = null;
      
      // Debug: Log what we're sending
      console.log('=== FRONTEND SUBMISSION DEBUG ===');
      console.log('actualDuration:', actualDuration);
      console.log('extraHour:', extraHour);
      console.log('selectedTour?.durationMinutes:', selectedTourData?.durationMinutes);
      console.log('isOpMaat:', tourIsOpMaat);
      console.log('===============================');
      
      try {
        const bookingPayload = {
          tourId: data.tourId,
          citySlug: data.city,
          dateTime: data.dateTime,
          language: data.language,
          contactLanguage: data.contactLanguage, // Language for email communications
          numberOfPeople: data.numberOfPeople,
          contactFirstName: data.contactFirstName,
          contactLastName: data.contactLastName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          companyName: data.companyName || null,
          vatNumber: normalizeVATNumber(data.vatNumber),
          billingAddress: data.billingAddress || null,
          street: data.street || null,
          streetNumber: data.streetNumber || null,
          postalCode: data.postalCode || null,
          bus: data.bus || null,
          billingCity: data.billingCity || null,
          country: data.country || null,
          additionalInfo: data.additionalInfo || null,
          upsellProducts: upsellProducts, // Already in standardized format {n, p, q}
          // Op maat answers will be collected separately via /op-maat-form page
          opMaatAnswers: tourIsOpMaat ? {
            extraHour: extraHour, // Only save extra hour preference now
          } : null,
          isOpMaat: tourIsOpMaat, // Flag to indicate this is an op maat tour
          requestTanguy: requestTanguy,
          durationMinutes: actualDuration, // Include actual duration in booking
          weekendFee: weekendFee, // Weekend fee flag
          eveningFee: eveningFee, // Evening fee flag
        };
        
        console.log('Sending durationMinutes:', bookingPayload.durationMinutes);
        
        const bookingResponse = await fetch('/api/b2b-booking/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingPayload),
        });

        if (!bookingResponse.ok) {
          const errorData = await bookingResponse.json();
          console.error('Error creating B2B booking:', errorData);
          const errorMessage = errorData.error || errorData.message || t('error') || 'Failed to create booking';
          toast.error(errorMessage);
          // If we're on the payment step, show error on screen as well
          if (step === 'payment') {
            setDataError(errorMessage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          setIsSubmitting(false);
          return;
        }

        const bookingData = await bookingResponse.json();
        console.log('B2B booking created:', bookingData);
        
        // Clear any previous errors on success
        setDataError(null);
        
        if (bookingData.bookingId) {
          createdBookingId = bookingData.bookingId;
          setBookingId(bookingData.bookingId);
        }
      } catch (error) {
        console.error('Error creating B2B booking:', error);
        const errorMessage = error instanceof Error ? error.message : (t('error') || 'Failed to create booking');
        toast.error(errorMessage);
        // If we're on the payment step, show error on screen as well
        if (step === 'payment') {
          setDataError(errorMessage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setIsSubmitting(false);
        return;
      }
      
      // Build payload for webhook (include booking ID for op maat tours)
      const payload = {
        // Tour info
        dateTime: data.dateTime,
        citySlug: data.city,
        cityName: selectedCityData?.name ?? null,
        tourId: data.tourId,
        tourSlug: selectedTourData?.slug ?? null,
        tourTitle: selectedTourData?.title ?? null,
        tourDetails: {
          startLocation: selectedTourData?.startLocation ?? null,
          endLocation: selectedTourData?.endLocation ?? null,
          durationMinutes: selectedTourData?.durationMinutes ?? null,
          languages: selectedTourData?.languages ?? null,
          type: selectedTourData?.type ?? null,
        },
        language: data.language,
        contactLanguage: data.contactLanguage, // Language for email communications
        numberOfPeople: data.numberOfPeople,
        // Weekend and evening fees
        weekendFee: weekendFee,
        eveningFee: eveningFee,
        // Company info
        companyName: data.companyName || null,
        vatNumber: data.vatNumber || null,
        billingAddress: data.billingAddress || null,
        street: data.street || null,
        streetNumber: data.streetNumber || null,
        postalCode: data.postalCode || null,
        bus: data.bus || null,
        billingCity: data.billingCity || null,
        country: data.country || null,
        // Contact info
        contactFirstName: data.contactFirstName,
        contactLastName: data.contactLastName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        additionalInfo: data.additionalInfo || null,
        // Upsell - ensure standardized format {n, p, q}
        upsellProducts: upsellProducts.map((p: any) => {
          // If already in standardized format, return as-is
          if (p.n !== undefined && p.p !== undefined && p.q !== undefined) {
            return { n: p.n, p: p.p, q: p.q };
          }
          // Convert from legacy format {id, title, quantity, price} to standardized format
          return {
            n: p.title || p.name || 'Product',
            p: p.price || p.p || 0,
            q: p.quantity || p.q || 1,
          };
        }),
        // Booking type
        bookingType,
        // Meta
        submittedAt: new Date().toISOString(),
        status: 'quote_pending', // Quote status flow for B2B bookings
        // Always include booking ID (created for all tours)
        bookingId: createdBookingId,
      };

      // Call webhook for all tours (both op maat and regular)
      const response = await fetch('https://alexfinit.app.n8n.cloud/webhook/1ba3d62a-e6ae-48f9-8bbb-0b2be1c091bc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        toast.error(t('error'));
        return;
      }

      // Set op maat state
      setIsOpMaat(tourIsOpMaat);
      
      setStep('success');
      reset();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show cities that are live AND have at least one tour (excluding gift cards)
  const availableCities = cities.filter(city => 
    city.status === 'live' && 
    tours.some(tour => {
      // Match by city name in any language or slug
      // Match by cityId (primary method) or city slug (fallback)
      const matches = (tour.cityId && tour.cityId === city.id) || tour.city === city.slug;
      return matches && tour.slug !== 'cadeaubon';
    })
  );
  
  // Get available languages from the selected tour
  const availableLanguages = selectedTour?.languages ?? [];

  // Map language names to codes for translation
  const languageNameToCode: Record<string, string> = {
    'Nederlands': 'nl',
    'Engels': 'en',
    'Frans': 'fr',
    'Duits': 'de',
    'Spaans': 'es',
    'Italiaans': 'it',
    'Portugees': 'pt',
    'Pools': 'pl',
    'Russisch': 'ru',
    'Chinees': 'zh',
    'Japans': 'ja',
  };

  const getLanguageLabel = (lang: string) => {
    // If it's already a language name (like "Engels"), use it directly
    if (languageNameToCode[lang]) {
      const code = languageNameToCode[lang];
      return t(`languages.${code}`, { default: lang });
    }
    // If it's a code (like "en"), translate it
    return t(`languages.${lang}`, { default: lang });
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <div className="text-center space-y-4">
          <p className="text-red-600">{dataError}</p>
          <Button onClick={() => window.location.reload()}>{t('tryAgain')}</Button>
        </div>
      </div>
    );
  }

  // Success screen
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fdfcfa' }}>
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brass-light)' }}>
              <CheckCircle2 className="h-12 w-12" style={{ color: 'var(--brass)' }} />
            </div>
            <h1 className="mb-4 text-4xl font-bold font-serif text-navy">{t('successTitle')}</h1>
            <p className="mb-4 text-lg" style={{ color: 'var(--slate-blue)' }}>
              {t('requestSent')}
            </p>
            <p className="mb-8 text-base" style={{ color: 'var(--slate-blue)' }}>
              {t('checkAvailability')}
            </p>
            <p className="mb-8 text-sm" style={{ color: 'var(--slate-blue)' }}>
              {t('redirectingIn', { countdown })}
            </p>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => router.push(`/${locale}`)}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                {t('backToHome')}
              </Button>
              <Button
                onClick={() => router.push(`/${locale}/webshop`)}
                size="lg"
                className="gap-2 btn-primary"
              >
                <ShoppingBag className="h-4 w-4" />
                {t('exploreWebshop')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepNumber = step === 'select' ? 1 : step === 'contact' ? 2 : step === 'upsell' ? 3 : 4;

  return (
    <div className="min-h-screen bg-[#F9F9F7]">
      {/* Hero Section with Green Background */}
      <div className="bg-[#1BDD95] pt-10 md:pt-14 pb-32 md:pb-40 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="mb-4 text-5xl md:text-6xl lg:text-7xl font-bold font-oswald uppercase tracking-tight text-white">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-inter max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Content Section - overlaps the green */}
      <div className="container mx-auto px-4 -mt-24 md:-mt-32 pb-16">
        <div className="mx-auto max-w-3xl">
          {/* Progress steps */}
          <div className="mb-8 flex items-center justify-center">
            <div className="flex items-center gap-2 w-full max-w-md">
              {[1, 2, 3, 4].map((s) => {
                let bgColor = '#e5e7eb'; // Default gray for future steps
                if (stepNumber >= s) {
                  bgColor = '#1BDD95'; // Mint green for current and completed steps
                }
                return (
                  <div
                    key={s}
                    className="h-2 flex-1 rounded-full transition-all ring-2 ring-white/30"
                    style={{ backgroundColor: bgColor }}
                  />
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 rounded-2xl p-8 brass-corner shadow-lg" style={{ backgroundColor: '#faf8f5' }}>
            
            {/* Step 1: Select Tour & Date */}
            {step === 'select' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">{t('step1')}</h2>
                
                <div>
                  <Label htmlFor="city" className="flex items-center gap-2 text-base font-semibold text-navy">
                    <MapPin className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                    {t('cityLabel')}
                  </Label>
                  <Select value={selectedCity} onValueChange={(value) => setValue('city', value)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={t('selectCity')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCities.map((city) => (
                        <SelectItem key={city.slug} value={city.slug}>
                          {city.name.nl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCity && (availableTours.length > 0 || availableLectures.length > 0) && (
                  <div>
                    <Label htmlFor="tour" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Building2 className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {selectedLecture ? t('lectureLabel') : t('tourLabel')}
                    </Label>
                    <Select value={selectedTourId} onValueChange={(value) => setValue('tourId', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={t('selectTour')} />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Tours */}
                        {availableTours.map((tour) => (
                          <SelectItem key={String(tour.id ?? tour.slug)} value={String(tour.id ?? tour.slug)}>
                            {tour.title}
                          </SelectItem>
                        ))}
                        {/* Lectures */}
                        {availableLectures.length > 0 && (
                          <>
                            {availableTours.length > 0 && (
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t">
                                Lectures
                              </div>
                            )}
                            {availableLectures.map((lecture) => (
                              <SelectItem key={`lecture-${lecture.id}`} value={`lecture-${lecture.id}`}>
                                {locale === 'nl' ? lecture.title : (lecture.title_en || lecture.title)}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => window.open(`/${locale}/tours`, '_blank')}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--brass)' }}
                    >
                      {t('viewAllTours')} <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {(selectedTour || selectedLecture) && (
                  <div className="p-4 rounded-lg border-2" style={{ borderColor: 'var(--brass)', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    {selectedTour ? (
                      <>
                        <h3 className="font-semibold text-navy mb-2">{selectedTour.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatDuration(selectedTour.durationMinutes)}
                          </span>
                          {selectedTour.languages.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Languages className="h-4 w-4" />
                              {selectedTour.languages.join(', ')}
                            </span>
                          )}
                        </div>
                        {selectedTour.themes && selectedTour.themes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedTour.themes.map((theme, index) => (
                              <span
                                key={index}
                                className="text-xs px-2 py-1 rounded-full font-medium"
                                style={{
                                  backgroundColor: '#1BDD95',
                                  color: 'white',
                                }}
                              >
                                {getThemeText(theme)}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : selectedLecture ? (
                      <>
                        <h3 className="font-semibold text-navy mb-2">
                          {locale === 'nl' ? selectedLecture.title : (selectedLecture.title_en || selectedLecture.title)}
                        </h3>
                        {selectedLecture.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" />
                            {locale === 'nl' ? selectedLecture.location : (selectedLecture.location_en || selectedLecture.location)}
                          </div>
                        )}
                        {selectedLecture.group_size && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <Users className="h-4 w-4" />
                            {locale === 'nl' ? selectedLecture.group_size : (selectedLecture.group_size_en || selectedLecture.group_size)}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}

                {selectedTour && availableLanguages.length > 0 && (
                  <div>
                    <Label htmlFor="language" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Languages className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('languageLabel')}
                    </Label>
                    <Select value={watch('language')} onValueChange={(value) => setValue('language', value)}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={t('selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {getLanguageLabel(lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('availableLanguages')}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Calendar className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('dateLabel')}
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={(() => {
                        const oneWeekFromToday = new Date();
                        oneWeekFromToday.setDate(oneWeekFromToday.getDate() + 7);
                        return oneWeekFromToday.toISOString().split('T')[0];
                      })()}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeSlot" className="text-base font-semibold text-navy">
                      {t('timeSlotLabel')}
                    </Label>
                    <Select value={selectedTimeSlot} onValueChange={setSelectedTimeSlot} disabled={!selectedTour}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={selectedTour ? t('selectTime') : t('selectTourFirst')} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot.value} value={slot.value}>
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTour && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedTour.local_stories
                          ? t('localStoriesTime')
                          : t('tourDuration', { duration: formatDuration(actualDuration) })
                        }
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="numberOfPeople" className="flex items-center gap-2 text-base font-semibold text-navy">
                      <Users className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      {t('numberOfPeopleLabel')}
                    </Label>
                    <Input
                      id="numberOfPeople"
                      type="number"
                      min="15"
                      placeholder={t('peoplePlaceholder')}
                      {...register('numberOfPeople')}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Request Tanguy Ottomer Section - Only shown when available and date/time is selected */}
                {selectedCity && 
                 ['antwerpen', 'knokke-heist', 'spa'].includes(selectedCity.toLowerCase()) &&
                 selectedDate &&
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
                   <div className="rounded-lg border-2 p-4 transition-all hover:border-brass" style={{ borderColor: requestTanguy ? 'var(--brass)' : '#e5e7eb' }}>
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
                             checked={requestTanguy}
                             onCheckedChange={(checked) =>
                               setRequestTanguy(checked === true)
                             }
                             className="mt-1"
                           />
                           <div className="flex-1">
                             <Label
                               htmlFor="requestTanguy"
                               className="cursor-pointer text-base font-semibold text-navy"
                             >
                               {tBooking('requestTanguy')}
                             </Label>
                             <p className="mt-1 text-sm text-slate-blue">
                               {tBooking('requestTanguyDescription')}
                             </p>
                             <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                               {tBooking('tanguyLanguageDisclaimer')}
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

                {/* Extra Hour Checkbox - Only for opMaat tours when date & time are selected */}
                {isOpMaat && selectedDate && selectedTimeSlot && (
                  <div className="rounded-lg border-2 p-4 border-gray-200">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="extraHour"
                        checked={extraHour}
                        onCheckedChange={(checked) =>
                          setExtraHour(checked === true)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor="extraHour"
                          className="cursor-pointer text-base font-semibold text-navy"
                        >
                          {tBooking('addExtraHour')}
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                <Button type="button" onClick={goToContact} className="w-full btn-primary" disabled={!selectedTour || !selectedDate || !selectedTimeSlot || numPeople < 15}>
                  {t('continueButton')}
                </Button>
              </div>
            )}

            {/* Step 2: Contact & Company Info */}
            {step === 'contact' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">{t('step2')}</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactFirstName" className="text-base font-semibold text-navy">{t('firstName')}</Label>
                    <Input id="contactFirstName" {...register('contactFirstName')} className="mt-2" />
                    {errors.contactFirstName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contactLastName" className="text-base font-semibold text-navy">{t('lastName')}</Label>
                    <Input id="contactLastName" {...register('contactLastName')} className="mt-2" />
                    {errors.contactLastName && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail" className="text-base font-semibold text-navy">{t('emailLabel')}</Label>
                    <Input id="contactEmail" type="email" {...register('contactEmail')} className="mt-2" />
                    {errors.contactEmail && <p className="mt-1 text-sm text-destructive">{tForms('invalidEmail')}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contactPhone" className="text-base font-semibold text-navy">{t('phoneLabel')}</Label>
                    <Input id="contactPhone" type="tel" {...register('contactPhone')} className="mt-2" />
                    {errors.contactPhone && <p className="mt-1 text-sm text-destructive">{tForms('required')}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="contactLanguage" className="text-base font-semibold text-navy">{tBooking('contactLanguage')}</Label>
                  <Select
                    value={watch('contactLanguage')}
                    onValueChange={(value) => setValue('contactLanguage', value)}
                  >
                    <SelectTrigger id="contactLanguage" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nl">Nederlands</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">{tBooking('contactLanguageDescription')}</p>
                </div>

                {/* Booking type toggle */}
                <div className="flex items-center justify-center py-4">
                  <div className="inline-flex rounded-lg border-2 p-1" style={{ borderColor: 'var(--brass)' }}>
                    <Button
                      type="button"
                      onClick={() => setBookingType('particulier')}
                      variant={bookingType === 'particulier' ? "default" : "ghost"}
                      className={`gap-2 ${bookingType === 'particulier' ? 'btn-primary' : ''}`}
                    >
                      {bookingType === 'particulier' && <CheckCircle2 className="h-4 w-4" />}
                      {t('individual')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setBookingType('zakelijk')}
                      variant={bookingType === 'zakelijk' ? "default" : "ghost"}
                      className={`gap-2 ${bookingType === 'zakelijk' ? 'btn-primary' : ''}`}
                    >
                      {bookingType === 'zakelijk' && <CheckCircle2 className="h-4 w-4" />}
                      <Building2 className="h-4 w-4" />
                      {t('business')}
                    </Button>
                  </div>
                </div>

                {bookingType === 'zakelijk' && (
                  <div className="space-y-4 p-6 rounded-lg border-2 animate-in fade-in slide-in-from-top-2 duration-300" style={{ borderColor: 'var(--brass)', backgroundColor: 'rgba(212, 175, 55, 0.05)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5" style={{ color: 'var(--brass)' }} />
                      <h3 className="font-semibold text-navy">{t('invoiceDetails')}</h3>
                    </div>

                    <div>
                      <Label htmlFor="companyName" className="text-base font-semibold text-navy">{t('companyNameLabel')}</Label>
                      <Input id="companyName" {...register('companyName')} className="mt-2" />
                    </div>

                    <div>
                      <Label htmlFor="vatNumber" className="text-base font-semibold text-navy">{t('vatNumber')}</Label>
                      <Input 
                        id="vatNumber" 
                        name="vatNumber"
                        value={vatNumber}
                        placeholder="BE 0123.456.789" 
                        onChange={handleVATInputChange}
                        onPaste={handleVATInputPaste}
                        onKeyDown={handleVATInputKeyDown}
                        onBlur={(e) => {
                          // Normalize VAT number on blur (remove spaces, dots, hyphens, uppercase)
                          const normalized = normalizeVATNumber(e.target.value);
                          if (normalized) {
                            setValue('vatNumber', normalized, { shouldValidate: true });
                          } else if (e.target.value.trim()) {
                            // If there's a value but normalization failed, trigger validation to show error
                            trigger('vatNumber');
                          }
                        }}
                        maxLength={17} // BE 0123.456.789 = 17 characters max
                        className={`mt-2 font-mono ${errors.vatNumber ? 'border-red-500 border-2 focus-visible:ring-red-500' : ''}`}
                      />
                      {errors.vatNumber && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-red-600 font-medium">{errors.vatNumber.message}</p>
                        </div>
                      )}
                      {!errors.vatNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: BE 0123.456.789 (auto-formatted as you type)
                        </p>
                      )}
                    </div>

                    {/* Address Fields */}
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold text-navy mb-4">{t('billingAddressLabel')}</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="sm:col-span-2">
                          <Label htmlFor="street" className="text-base font-semibold text-navy">{t('street')}</Label>
                          <Input id="street" {...register('street')} className="mt-2" />
                        </div>
                        <div>
                          <Label htmlFor="streetNumber" className="text-base font-semibold text-navy">{t('streetNumber')}</Label>
                          <Input id="streetNumber" {...register('streetNumber')} className="mt-2" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label htmlFor="postalCode" className="text-base font-semibold text-navy">{t('postalCode')}</Label>
                          <Input id="postalCode" {...register('postalCode')} className="mt-2" />
                        </div>
                        <div>
                          <Label htmlFor="bus" className="text-base font-semibold text-navy">{t('bus')}</Label>
                          <Input id="bus" placeholder={t('busPlaceholder')} {...register('bus')} className="mt-2" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="billingCity" className="text-base font-semibold text-navy">{t('city')}</Label>
                          <Input id="billingCity" {...register('billingCity')} className="mt-2" />
                        </div>
                        <div>
                          <Label htmlFor="country" className="text-base font-semibold text-navy">{t('country')}</Label>
                          <Select
                            value={watch('country') || ''}
                            onValueChange={(value) => setValue('country', value)}
                          >
                            <SelectTrigger id="country" className="mt-2">
                              <SelectValue placeholder={t('selectCountry') || 'Select country'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BE">België / Belgium</SelectItem>
                              <SelectItem value="NL">Nederland / Netherlands</SelectItem>
                              <SelectItem value="FR">France</SelectItem>
                              <SelectItem value="DE">Deutschland / Germany</SelectItem>
                              <SelectItem value="GB">United Kingdom</SelectItem>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                              <SelectItem value="AU">Australia</SelectItem>
                              <SelectItem value="ES">España / Spain</SelectItem>
                              <SelectItem value="IT">Italia / Italy</SelectItem>
                              <SelectItem value="PT">Portugal</SelectItem>
                              <SelectItem value="CH">Schweiz / Switzerland</SelectItem>
                              <SelectItem value="AT">Österreich / Austria</SelectItem>
                              <SelectItem value="LU">Luxembourg</SelectItem>
                              <SelectItem value="DK">Danmark / Denmark</SelectItem>
                              <SelectItem value="SE">Sverige / Sweden</SelectItem>
                              <SelectItem value="NO">Norge / Norway</SelectItem>
                              <SelectItem value="FI">Suomi / Finland</SelectItem>
                              <SelectItem value="PL">Polska / Poland</SelectItem>
                              <SelectItem value="CZ">Česká republika / Czech Republic</SelectItem>
                              <SelectItem value="IE">Ireland</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="additionalInfo" className="text-base font-semibold text-navy">{t('commentsLabel')}</Label>
                  <Textarea
                    id="additionalInfo"
                    rows={3}
                    placeholder={t('commentsPlaceholder')}
                    {...register('additionalInfo')}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('select')} variant="outline" className="flex-1">
                    {t('backButton')}
                  </Button>
                  <Button type="button" onClick={goToUpsell} className="flex-1 btn-primary">
                    {t('continueNext')}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Upsell */}
            {step === 'upsell' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--brass-light)' }}>
                    <Gift className="h-8 w-8" style={{ color: 'var(--brass)' }} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-navy mb-2">{t('step3Title')}</h2>
                  <p className="text-muted-foreground">{t('step3Subtitle')}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {products.map((product) => {
                    const quantity = selectedUpsell[product.uuid] || 0;
                    const isSelected = quantity > 0;
                    
                    return (
                      <div
                        key={product.uuid}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-brass bg-brass/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
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
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.title.nl}</p>
                            <p className="text-xs text-muted-foreground mt-1">€{product.price?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                        
                        {isSelected ? (
                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200">
                            <span className="text-sm font-medium text-muted-foreground">Aantal:</span>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  decrementUpsell(product.uuid);
                                }}
                                className="h-8 w-8 p-0 rounded-full"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-lg font-semibold min-w-[2rem] text-center">
                                {quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  incrementUpsell(product.uuid);
                                }}
                                className="h-8 w-8 p-0 rounded-full"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              incrementUpsell(product.uuid);
                            }}
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

                {Object.keys(selectedUpsell).length > 0 && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--brass-light)' }}>
                    <p className="font-semibold">
                      ✓ {Object.values(selectedUpsell).reduce((sum, qty) => sum + qty, 0)} product{Object.values(selectedUpsell).reduce((sum, qty) => sum + qty, 0) > 1 ? 'en' : ''} geselecteerd
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" onClick={() => setStep('contact')} variant="outline" className="flex-1">
                    {t('backButton')}
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      // Check if tour is op maat to determine next step
                      // All tours go directly to payment step (op maat form is sent separately after booking)
                      setStep('payment');
                    }} 
                    className="flex-1 btn-primary"
                  >
                    {Object.keys(selectedUpsell).length > 0 ? 'Verder met producten →' : 'Overslaan →'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm Quote Request */}
            {step === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold text-navy mb-6">{t('step4')}</h2>

                {/* Display validation errors if any */}
                {(Object.keys(errors).length > 0 || dataError) && (
                  <div className="p-4 rounded-lg bg-red-50 border-2 border-red-200">
                    <h3 className="font-semibold text-red-800 mb-2">
                      {dataError ? (t('error') || 'Fout') : (t('validationErrors') || 'Er zijn validatiefouten:')}
                    </h3>
                    {dataError ? (
                      <p className="text-sm text-red-700">{dataError}</p>
                    ) : (
                      <>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                          {errors.contactFirstName && (
                            <li>{tForms('required')} - {t('contactFirstName') || 'Voornaam'}</li>
                          )}
                          {errors.contactLastName && (
                            <li>{tForms('required')} - {t('contactLastName') || 'Achternaam'}</li>
                          )}
                          {errors.contactEmail && (
                            <li>{errors.contactEmail.message || tForms('invalidEmail')} - {t('contactEmail') || 'E-mail'}</li>
                          )}
                          {errors.contactPhone && (
                            <li>{tForms('required')} - {t('contactPhone') || 'Telefoon'}</li>
                          )}
                          {errors.vatNumber && (
                            <li>{errors.vatNumber.message || tForms('invalidVAT')} - {t('vatNumber') || 'BTW-nummer'}</li>
                          )}
                        </ul>
                        <p className="mt-3 text-sm text-red-600 font-medium">
                          {t('pleaseFixErrors') || 'Gelieve de bovenstaande fouten te corrigeren en opnieuw te proberen.'}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Order summary with pricing */}
                <div className="p-6 rounded-lg" style={{ backgroundColor: 'white', border: '2px solid var(--brass)' }}>
                  <h3 className="font-semibold text-navy mb-4">{t('summaryTitle')}</h3>
                  <div className="space-y-3 text-sm">
                    {/* Tour info */}
                    <div className="font-medium text-navy text-base">{selectedTour?.title}</div>
                    <div className="text-muted-foreground">
                      {t('participants', { count: numPeople, plural: numPeople > 1 ? 's' : '' })} • {selectedDate} om {selectedTimeSlot}
                    </div>
                    
                    {/* Pricing breakdown */}
                    <div className="pt-3 space-y-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                      <div className="font-semibold text-navy">Geschatte prijsopgave:</div>
                      
                      {/* Tour price */}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tour ({numPeople} {numPeople === 1 ? 'persoon' : 'personen'})
                        </span>
                        <span className="font-medium">
                          €{((selectedTour?.price || 0) * numPeople).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Tanguy option */}
                      {requestTanguy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tanguy Ottomer als gids</span>
                          <span className="font-medium">€125.00</span>
                        </div>
                      )}
                      
                      {/* Extra hour */}
                      {extraHour && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Extra uur (+1 uur)</span>
                          <span className="font-medium">€150.00</span>
                        </div>
                      )}
                      
                      {/* Upsell products */}
                      {Object.keys(selectedUpsell).length > 0 && (
                        <div className="pt-2 space-y-1" style={{ borderTop: '1px solid #e5e7eb' }}>
                          <div className="font-medium text-navy">Extra producten:</div>
                          {Object.entries(selectedUpsell).map(([productId, quantity]) => {
                            const product = products.find(p => p.uuid === productId);
                            if (!product || quantity === 0) return null;
                            const itemTotal = (product.price || 0) * quantity;
                            return (
                              <div key={productId} className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {product.title.nl} × {quantity}
                                </span>
                                <span className="font-medium">€{itemTotal.toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Weekend and Evening Fees */}
                      {(() => {
                        // Calculate weekend fee: €25 if date is Saturday or Sunday in Brussels timezone, except for local_stories
                        const isWeekend = selectedDate ? isWeekendBrussels(selectedDate) : false;
                        const weekendFeeCost = isWeekend && selectedTour?.local_stories !== true ? 25 : 0;

                        // Calculate evening fee: €25 for op_maat tours if time >= 17:00
                        const tourIsOpMaat = selectedTour?.op_maat === true || 
                                            (typeof selectedTour?.op_maat === 'string' && selectedTour.op_maat === 'true') || 
                                            (typeof selectedTour?.op_maat === 'number' && selectedTour.op_maat === 1);
                        const isEveningSlot = selectedTimeSlot && parseInt(selectedTimeSlot.split(':')[0], 10) >= 17;
                        const eveningFeeCost = tourIsOpMaat && isEveningSlot ? 25 : 0;

                        return (weekendFeeCost > 0 || eveningFeeCost > 0) ? (
                          <div className="pt-2 space-y-1" style={{ borderTop: '1px solid #e5e7eb' }}>
                            {weekendFeeCost > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Weekend toeslag
                                </span>
                                <span className="font-medium">€{weekendFeeCost.toFixed(2)}</span>
                              </div>
                            )}
                            {eveningFeeCost > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Avond toeslag
                                </span>
                                <span className="font-medium">€{eveningFeeCost.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Total */}
                      <div className="pt-3 flex justify-between" style={{ borderTop: '2px solid var(--brass)' }}>
                        <span className="font-bold text-navy text-base">Geschat Totaal</span>
                        <span className="font-bold text-lg" style={{ color: 'var(--brass)' }}>
                          €{(() => {
                            const tourTotal = (selectedTour?.price || 0) * numPeople;
                            const tanguyCost = requestTanguy ? 125 : 0;
                            const extraHourCost = extraHour ? 150 : 0;
                            const upsellTotal = Object.entries(selectedUpsell).reduce((sum, [productId, quantity]) => {
                              const product = products.find(p => p.uuid === productId);
                              return sum + ((product?.price || 0) * quantity);
                            }, 0);
                            
                            // Calculate weekend and evening fees
                            const isWeekend = selectedDate ? isWeekendBrussels(selectedDate) : false;
                            const weekendFeeCost = isWeekend && selectedTour?.local_stories !== true ? 25 : 0;
                            
                            const tourIsOpMaat = selectedTour?.op_maat === true || 
                                                (typeof selectedTour?.op_maat === 'string' && selectedTour.op_maat === 'true') || 
                                                (typeof selectedTour?.op_maat === 'number' && selectedTour.op_maat === 1);
                            const isEveningSlot = selectedTimeSlot && parseInt(selectedTimeSlot.split(':')[0], 10) >= 17;
                            const eveningFeeCost = tourIsOpMaat && isEveningSlot ? 25 : 0;
                            
                            return (tourTotal + tanguyCost + extraHourCost + upsellTotal + weekendFeeCost + eveningFeeCost).toFixed(2);
                          })()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-muted-foreground italic pt-2">
                        * Dit is een geschatte prijs. De definitieve offerte kan afwijken op basis van specifieke wensen.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {t('confirmationNote')}
                </p>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    onClick={() => {
                      setDataError(null); // Clear errors when going back
                      setStep('upsell');
                    }} 
                    variant="outline" 
                    className="flex-1"
                  >
                    ← Terug
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1 btn-primary">
                    {isSubmitting ? t('submitting') : t('confirmRequest')}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
