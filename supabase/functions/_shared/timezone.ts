/**
 * Timezone utilities for Europe/Brussels
 * Handles CET (UTC+1) in winter and CEST (UTC+2) in summer
 */

const BRUSSELS_TIMEZONE = 'Europe/Brussels';

/**
 * Convert a date to Brussels timezone and return ISO string WITHOUT timezone offset
 * This is used for storing datetimes in the database as Brussels local time
 * @param date - Date object or ISO string
 * @returns ISO string without timezone offset (e.g., "2025-01-15T14:00:00")
 */
export function toBrusselsLocalISO(date: Date | string): string {
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

  // Return ISO string WITHOUT timezone offset (Brussels local time)
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * Convert a date to Brussels timezone and return ISO string with correct offset
 * @param date - Date object or ISO string
 * @returns ISO string with Brussels timezone offset (e.g., "2025-01-15T14:00:00+01:00")
 * @deprecated Use toBrusselsLocalISO for database storage to avoid timezone offsets
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
  const utcTime = d.getTime();
  const brusselsDate = new Date(d.toLocaleString('en-US', { timeZone: BRUSSELS_TIMEZONE }));
  const offsetMs = brusselsDate.getTime() - new Date(d.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const offsetHours = Math.round(offsetMs / (60 * 60 * 1000));
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetStr}`;
}

/**
 * Parse a date string and interpret it as Brussels local time
 * @param dateStr - Date string in format "YYYY-MM-DD"
 * @param timeStr - Time string in format "HH:mm" or "HH:mm:ss"
 * @returns Date object representing that moment in Brussels timezone
 */
export function parseBrusselsDateTime(dateStr: string, timeStr: string): Date {
  // Ensure time has seconds
  const normalizedTime = timeStr.includes(':') && timeStr.split(':').length === 2
    ? `${timeStr}:00`
    : timeStr;

  // Create a date string that will be parsed as Brussels time
  const brusselsStr = `${dateStr}T${normalizedTime}`;

  // Parse in Brussels timezone by using the offset
  const tempDate = new Date(brusselsStr);

  // Determine if DST is active for this date in Brussels
  const jan = new Date(tempDate.getFullYear(), 0, 1);
  const jul = new Date(tempDate.getFullYear(), 6, 1);
  const janOffset = -jan.getTimezoneOffset();
  const julOffset = -jul.getTimezoneOffset();
  const stdOffset = Math.min(janOffset, julOffset);

  // Get Brussels offset for this specific date
  const testDate = new Date(brusselsStr + 'Z');
  const brusselsTime = new Date(testDate.toLocaleString('en-US', { timeZone: BRUSSELS_TIMEZONE }));
  const utcTime = new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const brusselsOffsetMs = brusselsTime.getTime() - utcTime.getTime();
  const brusselsOffsetHours = brusselsOffsetMs / (60 * 60 * 1000);

  // Create the correct UTC time by subtracting Brussels offset
  const utcMs = new Date(brusselsStr).getTime() - (brusselsOffsetHours * 60 * 60 * 1000);

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
 * Add duration to a date and return Brussels ISO string WITHOUT timezone offset
 * @param date - Start date
 * @param minutes - Minutes to add
 * @returns ISO string without timezone offset (Brussels local time)
 */
export function addMinutesBrussels(date: Date | string, minutes: number): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }
  
  // Add minutes (works correctly with Date objects regardless of timezone)
  const resultDate = new Date(d.getTime() + minutes * 60 * 1000);
  
  // Convert back to Brussels local ISO string (without timezone offset)
  return toBrusselsLocalISO(resultDate);
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
