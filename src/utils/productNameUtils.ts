/**
 * Utility functions for handling product names consistently across the application
 */

/**
 * Extracts the base product name by removing customization details
 * "Croffle Overload with Choco Flakes" → "Croffle Overload"
 * "Mini Croffle with Colored Sprinkles and Caramel" → "Mini Croffle"
 */
export const extractBaseProductName = (productName: string): string => {
  if (!productName) return '';
  
  // Remove everything after " with " (case insensitive)
  const withIndex = productName.toLowerCase().indexOf(' with ');
  if (withIndex !== -1) {
    return productName.substring(0, withIndex).trim();
  }
  
  return productName.trim();
};

/**
 * Checks if a product name appears to be a Mix & Match product
 */
export const isMixMatchProduct = (productName: string): boolean => {
  if (!productName) return false;
  
  const baseName = extractBaseProductName(productName).toLowerCase();
  return baseName.includes('croffle overload') || baseName.includes('mini croffle');
};