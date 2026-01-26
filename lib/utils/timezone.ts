/**
 * Timezone utilities for Europe/Brussels
 * Handles CET (UTC+1) in winter and CEST (UTC+2) in summer
 */

import { format as formatDateFns } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

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

  // Get the offset for Brussels at this specific date/time
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

  // Calculate the offset by comparing UTC time with Brussels time
  const brusselsDate = new Date(d.toLocaleString('en-US', { timeZone: BRUSSELS_TIMEZONE }));
  const utcDate = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMs = brusselsDate.getTime() - utcDate.getTime();
  const offsetHours = Math.round(offsetMs / (60 * 60 * 1000));
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

  // Create a date string
  const brusselsStr = `${dateStr}T${normalizedTime}`;

  // Parse the date first to get a reference point
  const tempDate = new Date(brusselsStr + 'Z'); // Treat as UTC temporarily

  // Get Brussels offset for this specific date
  const brusselsTime = new Date(tempDate.toLocaleString('en-US', { timeZone: BRUSSELS_TIMEZONE }));
  const utcTime = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const brusselsOffsetMs = brusselsTime.getTime() - utcTime.getTime();
  const brusselsOffsetHours = brusselsOffsetMs / (60 * 60 * 1000);

  // Create the correct UTC time by subtracting Brussels offset from the "local" time
  // e.g., 14:00 Brussels (UTC+1) = 13:00 UTC
  const localMs = new Date(brusselsStr).getTime();
  const utcMs = localMs - (brusselsOffsetHours * 60 * 60 * 1000);

  return new Date(utcMs);
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
 * @param date - Start date
 * @param minutes - Minutes to add
 * @returns ISO string with Brussels timezone offset
 */
export function addMinutesBrussels(date: Date | string, minutes: number): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  d.setTime(d.getTime() + minutes * 60 * 1000);
  return toBrusselsISO(d);
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
 * @param dateStr - ISO date string (can be UTC or any timezone)
 * @param formatStr - Format string compatible with date-fns format (e.g., 'dd/MM/yyyy HH:mm', 'dd MMMM yyyy, HH:mm')
 * @returns Formatted date string in Brussels timezone
 */
export function formatBrusselsDateTime(dateStr: string | null, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  if (!dateStr) return 'N/A';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }

    // Convert UTC date to Brussels timezone and format it
    const brusselsDate = utcToZonedTime(date, BRUSSELS_TIMEZONE);
    return formatDateFns(brusselsDate, formatStr);
  } catch (error) {
    console.error('Error formatting Brussels datetime:', error);
    return dateStr;
  }
}