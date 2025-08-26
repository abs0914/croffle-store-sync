
<<<<<<< HEAD
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
=======
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
>>>>>>> 84181ad48801591cc84f3da69c5078f7b74dbb92

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
