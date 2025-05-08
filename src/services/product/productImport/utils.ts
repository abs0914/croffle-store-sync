
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
  
  return [
    stringifyForCSV(product.name),
    stringifyForCSV(product.sku),
    stringifyForCSV(product.description || ''),
    product.stockQuantity || product.stock_quantity,
    product.isActive || product.is_active ? 'true' : 'false',
    product.variations && product.variations.length > 0 ? 'true' : 'false',
    regularVariation ? regularVariation.price : product.price,
    miniVariation ? miniVariation.price : (product.price || 0) * 0.7,
    overloadVariation ? overloadVariation.price : (product.price || 0) * 1.3
  ].map(item => String(item));
};
