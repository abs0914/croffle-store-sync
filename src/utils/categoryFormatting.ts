/**
 * Format category enum values into human-readable display names
 * @param category - The category enum value (e.g., 'base_ingredient')
 * @returns Formatted display name (e.g., 'Base Ingredient')
 */
export const formatCategory = (category: string | null | undefined): string => {
  if (!category) return 'Uncategorized';
  
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Parse formatted category display name back to enum value
 * @param displayName - The formatted display name (e.g., 'Base Ingredient')
 * @returns Category enum value (e.g., 'base_ingredient')
 */
export const parseCategory = (displayName: string | null | undefined): string => {
  if (!displayName || displayName === 'Uncategorized') return '';
  
  return displayName
    .toLowerCase()
    .replace(/\s+/g, '_');
};

/**
 * Get all available category options for display
 */
export const getCategoryOptions = (): Array<{ value: string; label: string }> => {
  const categories = [
    'base_ingredient',
    'classic_sauce',
    'premium_sauce',
    'classic_topping',
    'premium_topping',
    'packaging',
    'biscuit'
  ];
  
  return categories.map(category => ({
    value: category,
    label: formatCategory(category)
  }));
};