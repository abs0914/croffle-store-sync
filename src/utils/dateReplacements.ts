import { formatDateTime, formatDate, formatDateTimeDetailed } from './format';

/**
 * Standardized date formatters using Philippines timezone
 * Use these instead of toLocaleString() or toLocaleDateString()
 */

export const formatDateTimeInPH = (date: string | Date): string => {
  return formatDateTime(date);
};

export const formatDateInPH = (date: string | Date): string => {
  return formatDate(date);
};

export const formatDateTimeDetailedInPH = (date: string | Date): string => {
  return formatDateTimeDetailed(date);
};

/**
 * Helper to replace common date formatting patterns
 */
export const replaceDateFormatters = {
  // Replace: new Date(date).toLocaleString()
  dateTime: formatDateTimeInPH,
  
  // Replace: new Date(date).toLocaleDateString() 
  date: formatDateInPH,
  
  // Replace: new Date(date).toLocaleString() with seconds
  dateTimeDetailed: formatDateTimeDetailedInPH,
};