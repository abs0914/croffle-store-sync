
/**
 * Formats a number as currency in Philippine Peso (₱)
 * Uses a fallback approach to ensure ₱ symbol is always displayed correctly
 */
export function formatCurrency(amount: number): string {
  try {
    // Try using the proper locale first
    const formatted = new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

    // Check if the result contains the peso symbol or if it's showing dollar sign
    if (formatted.includes('₱')) {
      return formatted;
    }

    // Fallback: manually format with peso symbol if locale doesn't work properly
    const numberFormatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

    return `₱${numberFormatted}`;
  } catch (error) {
    // Ultimate fallback: manual formatting
    const numberFormatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `₱${numberFormatted}`;
  }
}

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
};

export const formatDateTimeDetailed = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric', 
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Manila',
  });
};
