import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

// Philippines timezone constant
export const PHILIPPINES_TIMEZONE = 'Asia/Manila';

/**
 * Converts any date to Philippines timezone
 */
export function toPhilippinesTime(date: string | Date): Date {
  return toZonedTime(date, PHILIPPINES_TIMEZONE);
}

/**
 * Formats date in Philippines timezone with specified format
 */
export function formatInPhilippinesTime(date: string | Date, formatStr: string): string {
  try {
    return formatInTimeZone(date, PHILIPPINES_TIMEZONE, formatStr);
  } catch (error) {
    console.error('Error formatting date in Philippines timezone:', error);
    return format(new Date(date), formatStr);
  }
}

/**
 * Gets current date in Philippines timezone
 */
export function nowInPhilippines(): Date {
  return toPhilippinesTime(new Date());
}

/**
 * Gets start of day in Philippines timezone (00:00:00)
 */
export function startOfDayInPhilippines(date: string | Date): string {
  const phDate = toPhilippinesTime(date);
  return formatInPhilippinesTime(phDate, "yyyy-MM-dd'T'00:00:00");
}

/**
 * Gets end of day in Philippines timezone (23:59:59)
 */
export function endOfDayInPhilippines(date: string | Date): string {
  const phDate = toPhilippinesTime(date);
  return formatInPhilippinesTime(phDate, "yyyy-MM-dd'T'23:59:59");
}

/**
 * Converts Philippines local time to UTC for database storage
 */
export function philippinesTimeToUTC(localDateTime: string): string {
  try {
    // Parse as Philippines time and convert to UTC
    const phDate = new Date(localDateTime + (localDateTime.includes('T') ? '' : 'T00:00:00'));
    return phDate.toISOString();
  } catch (error) {
    console.error('Error converting Philippines time to UTC:', error);
    return new Date(localDateTime).toISOString();
  }
}

/**
 * Gets date range in Philippines timezone for database queries
 */
export function getDateRangeInPhilippines(fromDate: string, toDate?: string) {
  const from = startOfDayInPhilippines(fromDate);
  const to = toDate ? endOfDayInPhilippines(toDate) : endOfDayInPhilippines(fromDate);
  
  return {
    from: philippinesTimeToUTC(from),
    to: philippinesTimeToUTC(to),
    localFrom: from,
    localTo: to
  };
}