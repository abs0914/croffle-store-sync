import { Category } from "@/types";

/**
 * Custom category ordering for POS interface
 * Order: Croffle categories first, then Espresso, then Beverages, then others
 */
export const CATEGORY_ORDER = [
  // Croffle Categories First
  'Classic',
  'Premium', 
  'Fruity',
  'Glaze',
  'Cold',
  'Blended',
  'Mix & Match',
  // Then Coffee Categories
  'Espresso',
  // Then Beverages
  'Beverages',
  // Finally Combos
  'Combo'
];

/**
 * Sort categories according to custom POS ordering
 * @param categories Array of categories to sort
 * @returns Sorted array of categories
 */
export const sortCategoriesForPOS = (categories: Category[]): Category[] => {
  return [...categories].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.name);
    const bIndex = CATEGORY_ORDER.indexOf(b.name);
    
    // If both categories are in the custom order, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only 'a' is in custom order, it comes first
    if (aIndex !== -1 && bIndex === -1) {
      return -1;
    }
    
    // If only 'b' is in custom order, it comes first
    if (aIndex === -1 && bIndex !== -1) {
      return 1;
    }
    
    // If neither is in custom order, sort alphabetically
    return a.name.localeCompare(b.name);
  });
};

/**
 * Get the display order index for a category
 * @param categoryName Name of the category
 * @returns Order index (lower numbers appear first)
 */
export const getCategoryOrderIndex = (categoryName: string): number => {
  const index = CATEGORY_ORDER.indexOf(categoryName);
  return index !== -1 ? index : 999; // Put unknown categories at the end
};

/**
 * Check if a category should be displayed in the main POS menu
 * @param categoryName Name of the category
 * @returns True if category should be displayed
 */
export const shouldDisplayCategoryInPOS = (categoryName: string): boolean => {
  // Hide Add-on category from main POS (used for Mix & Match add-ons only)
  const hiddenCategories = ['add-on'];
  return !hiddenCategories.includes(categoryName.toLowerCase());
};

/**
 * Filter and sort categories for POS display
 * @param categories Array of categories to filter and sort
 * @returns Filtered and sorted categories for POS display
 */
export const prepareCategoriesForPOS = (categories: Category[]): Category[] => {
  // Filter out categories that shouldn't be displayed
  const filteredCategories = categories.filter(category => 
    category.is_active && shouldDisplayCategoryInPOS(category.name)
  );
  
  // Sort according to custom ordering
  return sortCategoriesForPOS(filteredCategories);
};
