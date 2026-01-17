import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from '@/i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get a localized field value with fallback logic.
 * Fallback chain:
 * - NL: NL only
 * - EN: EN -> NL
 * - FR: FR -> EN -> NL
 * - DE: DE -> EN -> NL
 *
 * @param fields - Object with locale keys (nl, en, fr, de) and their values
 * @param locale - The desired locale
 * @returns The localized value with fallback applied
 */
export function getLocalizedField(
  fields: { nl?: string | null; en?: string | null; fr?: string | null; de?: string | null },
  locale: Locale
): string {
  const nl = fields.nl || '';
  const en = fields.en || '';
  const fr = fields.fr || '';
  const de = fields.de || '';

  switch (locale) {
    case 'nl':
      return nl;
    case 'en':
      return en || nl;
    case 'fr':
      return fr || en || nl;
    case 'de':
      return de || en || nl;
    default:
      return nl;
  }
}

/**
 * Build a Record<Locale, string> with fallback values applied.
 * This is useful for building product/content records where each locale
 * should have a value (falling back to other languages if not available).
 *
 * @param fields - Object with locale keys (nl, en, fr, de) and their values
 * @returns Record<Locale, string> with fallbacks applied
 */
export function buildLocalizedRecord(
  fields: { nl?: string | null; en?: string | null; fr?: string | null; de?: string | null }
): Record<Locale, string> {
  const nl = fields.nl || '';
  const en = fields.en || nl;
  const fr = fields.fr || en || nl;
  const de = fields.de || en || nl;

  return { nl, en, fr, de };
}

/**
 * Booking type information
 */
export type BookingTypeInfo = {
  type: 'regular' | 'local_stories' | 'op_maat';
  category: 'B2C' | 'B2B';
  label: string;
  shortLabel: string;
  description: string;
};

/**
 * Standardized function to get booking type information
 * @param tour - Tour object with op_maat and local_stories properties
 * @param bookingType - Booking category ('B2C' or 'B2B')
 * @returns Standardized booking type information
 */
export function getBookingTypeInfo(
  tour?: { op_maat?: boolean; local_stories?: boolean } | null,
  bookingType?: string | null
): BookingTypeInfo {
  const category = (bookingType === 'B2B' ? 'B2B' : 'B2C') as 'B2C' | 'B2B';
  
  // Determine tour type
  if (tour?.op_maat) {
    return {
      type: 'op_maat',
      category,
      label: category === 'B2B' ? 'B2B Op Maat' : 'Op Maat',
      shortLabel: 'Op Maat',
      description: 'Custom/on-demand tour',
    };
  }
  
  if (tour?.local_stories) {
    return {
      type: 'local_stories',
      category,
      label: category === 'B2B' ? 'B2B Local Stories' : 'Local Stories',
      shortLabel: 'Local Stories',
      description: 'Group tour - Saturday 14:00',
    };
  }
  
  return {
    type: 'regular',
    category,
    label: category === 'B2B' ? 'B2B Regular' : 'Regular',
    shortLabel: category === 'B2B' ? 'B2B' : 'Regular',
    description: 'Standard tour booking',
  };
}

/**
 * Get booking type label for display
 */
export function getBookingTypeLabel(
  tour?: { op_maat?: boolean; local_stories?: boolean } | null,
  bookingType?: string | null
): string {
  return getBookingTypeInfo(tour, bookingType).label;
}

/**
 * Get booking type short label for badges/compact display
 */
export function getBookingTypeShortLabel(
  tour?: { op_maat?: boolean; local_stories?: boolean } | null,
  bookingType?: string | null
): string {
  return getBookingTypeInfo(tour, bookingType).shortLabel;
}