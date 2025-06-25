
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RAW_MATERIALS_DATA } from "./rawMaterialsData";

// Helper function to normalize unit values to match database constraints
const normalizeUnitValue = (unit: string): string => {
  const unitMapping: Record<string, string> = {
    // Standard weight units
    '1 kilo': 'kg',
    '1 kilogram': 'kg',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    
    // Gram variations
    'gram': 'g', 'grams': 'g', 'g': 'g',
    '900 grams': 'g', '2500 grams': 'g', '5000 grams': 'g',
    '1000 grams': 'g', '750 grams': 'g', '454 grams': 'g',
    '500 grams': 'g', '680 grams': 'g', '6000 grams': 'g',
    '630 grams': 'g', '510 grams': 'g',
    
    // Volume units
    '1 liter': 'liters', '1 litre': 'liters',
    'liter': 'liters', 'liters': 'liters',
    'litre': 'liters', 'litres': 'liters',
    'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
    
    // Count units
    'piece': 'pieces', 'pieces': 'pieces',
    'pcs': 'pieces', 'pc': 'pieces',
    
    // Box/Package units
    '1 box': 'boxes', '1 Box': 'boxes',
    'box': 'boxes', 'boxes': 'boxes',
    'pack': 'packs', 'packs': 'packs',
    'pack of 25': 'packs', 'pack of 50': 'packs',
    'pack of 100': 'packs', 'pack of 20': 'packs',
    'pack of 32': 'packs', 'pack of 24': 'packs',
    'pack of 27': 'packs'
  };
  
  const normalizedInput = unit.toLowerCase().trim();
  return unitMapping[normalizedInput] || 'pieces'; // Default to pieces if not found
};

export const uploadRawMaterialsData = async (): Promise<boolean> => {
  try {
    console.log('Starting bulk upload of raw materials:', RAW_MATERIALS_DATA);
    
    const processedIngredients = RAW_MATERIALS_DATA.map(item => {
      // Normalize the unit value to match database constraints
      const normalizedUnit = normalizeUnitValue(item.uom);
      console.log(`Normalizing unit "${item.uom}" to "${normalizedUnit}" for item "${item.name}"`);

      return {
        name: item.name,
        category: item.category,
        item_type: item.item_type,
        unit: normalizedUnit,
        unit_cost: item.unit_cost,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        supplier_id: null, // No suppliers assigned initially
        sku: item.sku,
        storage_location: item.storage_location,
        is_active: true
      };
    });

    console.log('Processed ingredients before insert:', processedIngredients);

    const { error } = await supabase
      .from('commissary_inventory')
      .insert(processedIngredients);

    if (error) {
      console.error('Database error during insert:', error);
      throw error;
    }
    
    toast.success(`Successfully uploaded ${RAW_MATERIALS_DATA.length} raw materials`);
    return true;
  } catch (error) {
    console.error('Error bulk uploading raw materials:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23514') {
        toast.error('Invalid unit values in data. Units have been normalized to match database constraints.');
      } else {
        toast.error(`Database error: ${error.message || 'Unknown error'}`);
      }
    } else {
      toast.error('Failed to upload raw materials');
    }
    return false;
  }
};
