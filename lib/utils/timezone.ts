/**
 * Timezone utilities for Europe/Brussels
 * Handles CET (UTC+1) in winter and CEST (UTC+2) in summer
 */

import { format as formatDateFns } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const BRUSSELS_TIMEZONE = 'Europe/Brussels';

/**
 * Convert a date to Brussels timezone and return ISO string with correct offset
 * @param date - Date object or ISO string
 * @returns ISO string with Brussels timezone offset (e.g., "2025-01-15T14:00:00+01:00")
 */
export function toBrusselsISO(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  // Get Brussels offset for this specific date
  const offsetHours = getBrusselsOffsetHours(d);
  
  // Get what Brussels time this UTC date represents
  // The Date object d represents a UTC moment, we need to show what Brussels local time that is
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRUSSELS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');
  
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetStr}`;
}

/**
 * Parse a date string and interpret it as Brussels local time
 * @param dateStr - Date string in format "YYYY-MM-DD"
 * @param timeStr - Time string in format "HH:mm" or "HH:mm:ss"
 * @returns Date object representing that moment in UTC
 */
export function parseBrusselsDateTime(dateStr: string, timeStr: string): Date {
  // Ensure time has seconds
  const normalizedTime = timeStr.includes(':') && timeStr.split(':').length === 2
    ? `${timeStr}:00`
    : timeStr;

  // Parse components
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute, second] = normalizedTime.split(':').map(Number);
  
  // Create a date string representing Brussels local time
  const brusselsLocalStr = `${dateStr}T${normalizedTime}`;
  
  // Create a reference UTC date at noon to determine Brussels offset for this date
  const referenceUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  
  // Get Brussels offset for this date
  const offsetHours = getBrusselsOffsetHours(referenceUTC);
  
  // Create a UTC date that represents the desired Brussels local time
  // If user wants 10:00 Brussels and Brussels is UTC+2 (DST), we need 08:00 UTC
  // Formula: UTC = Brussels local time - offset
  // We create the date as if it's UTC, then subtract the offset
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0));
  const correctUTC = new Date(utcDate.getTime() - (offsetHours * 60 * 60 * 1000));
  
  return correctUTC;
}

/**
 * Get current date/time in Brussels timezone as ISO string
 * @returns ISO string with Brussels timezone offset
 */
export function nowBrussels(): string {
  return toBrusselsISO(new Date());
}

/**
 * Add duration to a date and return Brussels ISO string
 * @param date - Start date (Date object or ISO string)
 * @param minutes - Minutes to add
 * @returns ISO string with Brussels timezone offset
 */
export function addMinutesBrussels(date: Date | string, minutes: number): string {
  // Parse the date string to a Date object
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Validate the date
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  // Add minutes (works correctly with Date objects regardless of timezone)
  const resultDate = new Date(d.getTime() + minutes * 60 * 1000);
  
  // Convert back to Brussels ISO string
  return toBrusselsISO(resultDate);
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday) in Brussels timezone
 * @param date - Date to check
 * @returns true if Saturday or Sunday in Brussels
 */
export function isWeekendBrussels(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const brusselsDay = new Intl.DateTimeFormat('en-US', {
    timeZone: BRUSSELS_TIMEZONE,
    weekday: 'short',
  }).format(d);
  return brusselsDay === 'Sat' || brusselsDay === 'Sun';
}

/**
 * Get the hour in Brussels timezone
 * @param date - Date to check
 * @returns Hour (0-23) in Brussels timezone
 */
export function getHourBrussels(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const brusselsHour = new Intl.DateTimeFormat('en-US', {
    timeZone: BRUSSELS_TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).format(d);
  return parseInt(brusselsHour, 10);
}

/**
 * Get Brussels timezone offset hours for a specific date
 * @param date - Date to check
 * @returns Offset hours (1 for winter, 2 for summer DST)
 */
export function getBrusselsOffsetHours(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const brusselsTime = new Date(d.toLocaleString('en-US', { timeZone: BRUSSELS_TIMEZONE }));
  const utcTime = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = brusselsTime.getTime() - utcTime.getTime();
  return Math.round(offsetMs / (60 * 60 * 1000));
}

/**
 * Format a date/time string for display in Brussels timezone
 * @param dateStr - ISO date string (stored as UTC but represents Brussels local time)
 * @param formatStr - Format string compatible with date-fns format (e.g., 'dd/MM/yyyy HH:mm', 'dd MMMM yyyy, HH:mm')
 * @returns Formatted date string in Brussels timezone
 */
export function formatBrusselsDateTime(dateStr: string | null, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  if (!dateStr) return 'N/A';
  
  try {
    // Dates stored in the database as "2026-01-25T10:00:00+00:00" represent 10:00 Brussels time,
    // not 10:00 UTC. The UTC time component actually represents Brussels local time.
    // So we extract the date/time components and create a date object that represents
    // that exact moment in Brussels timezone by constructing it with the Brussels offset.
    
    // Extract date and time components from the ISO string
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[+-](\d{2}):(\d{2})|Z)?$/);
    if (match) {
      const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = match;
      
      // Create a date string with Brussels timezone offset
      // The time components represent Brussels local time, so we construct a date string
      // with Brussels timezone offset, parse it, then convert to Brussels timezone for formatting
      const datePart = `${year}-${month}-${day}`;
      const timePart = `${hour}:${minute}:${second}`;
      
      // Get Brussels offset for this date
      const tempDate = new Date(`${datePart}T${timePart}Z`); // Temporary UTC date
      const brusselsOffset = getBrusselsOffsetHours(tempDate);
      const offsetStr = `${brusselsOffset >= 0 ? '+' : '-'}${String(Math.abs(brusselsOffset)).padStart(2, '0')}:00`;
      
      // Create date string with Brussels timezone
      const brusselsDateStr = `${datePart}T${timePart}${offsetStr}`;
      const parsedDate = new Date(brusselsDateStr);
      
      if (!isNaN(parsedDate.getTime())) {
        // Convert to Brussels timezone and format
        const brusselsDate = toZonedTime(parsedDate, BRUSSELS_TIMEZONE);
        return formatDateFns(brusselsDate, formatStr);
      }
    }
    
    // Fallback: parse as regular date and convert to Brussels timezone
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    
    const brusselsDate = toZonedTime(date, BRUSSELS_TIMEZONE);
    return formatDateFns(brusselsDate, formatStr);
  } catch (error) {
    console.error('Error formatting Brussels datetime:', error);
    return dateStr;
  }
}