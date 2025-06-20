
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

export const formatDateOnly = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
};
