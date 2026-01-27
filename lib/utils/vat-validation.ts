/**
 * VAT number validation utilities for TeamLeader API compatibility
 * Supports European VAT number formats
 */

import { z } from 'zod';

/**
 * Normalizes a VAT number by removing spaces, dots, and hyphens, and converting to uppercase.
 * This is used internally before validation.
 * 
 * @param vatNumber - VAT number to normalize
 * @returns Normalized VAT number (uppercase, no spaces/dots/hyphens)
 */
function normalizeVATInput(vatNumber: string): string {
  return vatNumber.trim().replace(/[\s.-]/g, '').toUpperCase();
}

/**
 * Validates a European VAT number format
 * Format: 2-letter country code followed by alphanumeric characters (8-12 chars)
 * Accepts formats with spaces, dots, and hyphens (e.g., "BE 0123.456.789")
 * 
 * @param vatNumber - VAT number to validate
 * @returns true if valid format, false otherwise
 */
export function isValidVATFormat(vatNumber: string): boolean {
  if (!vatNumber || vatNumber.trim() === '') {
    return true; // Empty is valid (optional field)
  }

  const normalized = normalizeVATInput(vatNumber);
  
  // European VAT number format: 2-letter country code + 8-12 alphanumeric characters
  // Examples: BE0123456789, NL123456789B01, FR12345678901, DE123456789
  // Also accepts: BE 0123.456.789 (normalized to BE0123456789)
  const vatRegex = /^[A-Z]{2}[A-Z0-9]{8,12}$/;
  
  return vatRegex.test(normalized);
}

/**
 * Validates Belgian VAT number with checksum
 * Belgian VAT format: BE + 10 digits (first 2 digits are often 0)
 * Accepts formats with spaces, dots, and hyphens (e.g., "BE 0123.456.789")
 * 
 * @param vatNumber - VAT number to validate
 * @returns true if valid Belgian VAT format, false otherwise
 */
export function isValidBelgianVAT(vatNumber: string): boolean {
  if (!vatNumber || vatNumber.trim() === '') {
    return true; // Empty is valid (optional field)
  }

  const normalized = normalizeVATInput(vatNumber);
  
  // Belgian VAT: BE + 10 digits
  if (!normalized.startsWith('BE')) {
    return false;
  }
  
  const digits = normalized.substring(2);
  
  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(digits)) {
    return false;
  }
  
  // Belgian VAT checksum validation
  // The last 2 digits are a checksum based on the first 8 digits
  const first8 = digits.substring(0, 8);
  const checksum = parseInt(digits.substring(8, 10), 10);
  
  // Calculate checksum: 97 - (first 8 digits mod 97)
  const calculatedChecksum = 97 - (parseInt(first8, 10) % 97);
  
  return calculatedChecksum === checksum;
}

/**
 * Normalizes a VAT number for TeamLeader API
 * Removes spaces, dots, and hyphens, converts to uppercase, and validates format
 * Accepts formats like "BE 0123.456.789" and normalizes to "BE0123456789"
 * 
 * @param vatNumber - VAT number to normalize
 * @returns Normalized VAT number or null if invalid
 */
export function normalizeVATNumber(vatNumber: string | null | undefined): string | null {
  if (!vatNumber || vatNumber.trim() === '') {
    return null;
  }

  const normalized = normalizeVATInput(vatNumber);
  
  // Validate format
  if (!isValidVATFormat(normalized)) {
    return null;
  }
  
  return normalized;
}

/**
 * Zod schema validator for VAT numbers
 * Validates format and optionally Belgian VAT checksum
 * Accepts formats with spaces, dots, and hyphens (e.g., "BE 0123.456.789")
 */
export const vatNumberSchema = (options?: { requireBelgian?: boolean }) => {
  return (options?.requireBelgian 
    ? z.string().optional().refine(
        (val) => !val || isValidBelgianVAT(val),
        { message: 'Invalid Belgian VAT number format. Expected format: BE 0123.456.789' }
      )
    : z.string().optional().refine(
        (val) => !val || isValidVATFormat(val),
        { message: 'Invalid VAT number format. Expected format: BE 0123.456.789 or BE0123456789' }
      )
  );
};
