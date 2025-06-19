
import { Product } from "@/types";

// Helper functions for CSV processing
export const stringifyForCSV = (value: string): string => {
  return `"${value.replace(/"/g, '""')}"`;
};

export const calculateVariationDistribution = (totalQuantity: number): number => {
  return Math.floor(totalQuantity / 3);
};

export const generateVariationSku = (baseSku: string, suffix: string): string => {
  return `${baseSku}-${suffix}`;
};

export const getVariationDefaultPrice = (
  basePrice: number, 
  size: 'regular' | 'mini' | 'croffle-overload', 
  prices: { [key: string]: number | undefined }
): number => {
  switch (size) {
    case 'regular':
      return prices.regular_price || basePrice;
    case 'mini':
      return prices.mini_price || (basePrice * 0.7);
    case 'croffle-overload':
      return prices.overload_price || (basePrice * 1.3);
    default:
      return basePrice;
  }
};

export const mapProductToCSVRow = (product: Product): string[] => {
  const regularVariation = product.variations?.find(v => v.size === 'regular');
  const miniVariation = product.variations?.find(v => v.size === 'mini');
  const overloadVariation = product.variations?.find(v => v.size === 'croffle-overload');
  
  const hasVariations = product.variations && product.variations.length > 0;
  
  // Helper function to get category name
  const getCategoryName = (category: Product['category']) => {
    if (!category) return '';
    return typeof category === 'string' ? category : category.name;
  };
  
  return [
    product.name,
    product.sku,
    product.description || '',
    getCategoryName(product.category),
    String(product.stockQuantity || product.stock_quantity || 0),
    (product.isActive || product.is_active) ? 'TRUE' : 'FALSE',
    hasVariations ? 'TRUE' : 'FALSE',
    String(regularVariation ? regularVariation.price : product.price),
    String(miniVariation ? miniVariation.price : ''),
    String(overloadVariation ? overloadVariation.price : '')
  ];
};
