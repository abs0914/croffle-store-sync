
import type { ValidUnit } from './types';

// Function to validate and convert unit to valid enum value
export const validateUnit = (unit: string): ValidUnit => {
  const validUnits: ValidUnit[] = ['kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs'];
  if (validUnits.includes(unit as ValidUnit)) {
    return unit as ValidUnit;
  }
  // Default to 'pieces' if unit is not recognized
  console.warn(`Invalid unit "${unit}", defaulting to "pieces"`);
  return 'pieces';
};

// Function to validate mapping data with proper type guards
export const validateMappingData = (mappingData: any): mappingData is { 
  conversion_factor: number; 
  inventory_stock_id: string 
} => {
  return mappingData && 
         typeof mappingData === 'object' && 
         mappingData !== null &&
         'conversion_factor' in mappingData && 
         'inventory_stock_id' in mappingData &&
         typeof mappingData.conversion_factor === 'number' &&
         typeof mappingData.inventory_stock_id === 'string';
};
