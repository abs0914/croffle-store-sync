// Centralized utilities with Philippines timezone standardization

// Format utilities with Philippines timezone
export {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatDateTimeDetailed
} from './format';

// Timezone utilities 
export {
  PHILIPPINES_TIMEZONE,
  toPhilippinesTime,
  formatInPhilippinesTime,
  nowInPhilippines,
  startOfDayInPhilippines,
  endOfDayInPhilippines,
  philippinesTimeToUTC,
  getDateRangeInPhilippines
} from './timezone';

// Date replacement helpers
export {
  formatDateTimeInPH,
  formatDateInPH,
  formatDateTimeDetailedInPH,
  replaceDateFormatters
} from './dateReplacements';

/**
 * MIGRATION GUIDE: Replace these patterns in your code
 * 
 * OLD: new Date(date).toLocaleString()
 * NEW: formatDateTime(date)
 * 
 * OLD: new Date(date).toLocaleDateString()  
 * NEW: formatDate(date)
 * 
 * OLD: `${date}T00:00:00` and `${date}T23:59:59`
 * NEW: getDateRangeInPhilippines(date)
 * 
 * OLD: new Date().toISOString()
 * NEW: nowInPhilippines().toISOString()
 */