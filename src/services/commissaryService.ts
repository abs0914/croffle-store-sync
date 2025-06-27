
import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem, RawIngredientUpload } from "@/types/commissary";
import { toast } from "sonner";

export const fetchCommissaryInventory = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    
    // Cast the data to ensure proper typing, mapping unit to uom
    return (data || []).map(item => ({
      ...item,
      uom: item.unit || 'units', // Map unit to uom with fallback
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      item_type: item.item_type as 'raw_material' | 'supply' | 'orderable_item'
    }));
  } catch (error) {
    console.error('Error fetching commissary inventory:', error);
    toast.error('Failed to fetch commissary inventory');
    return [];
  }
};

export const createCommissaryItem = async (item: Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
  try {
    // Map uom to unit for database compatibility during transition
    const dbItem = {
      ...item,
      unit: item.uom // Store UOM as unit in database for now
    };
    
    const { error } = await supabase
      .from('commissary_inventory')
      .insert(dbItem);

    if (error) throw error;
    toast.success('Commissary item created successfully');
    return true;
  } catch (error) {
    console.error('Error creating commissary item:', error);
    toast.error('Failed to create commissary item');
    return false;
  }
};

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
    'gram': 'g',
    'grams': 'g',
    'g': 'g',
    '900 grams': 'g',
    '2500 grams': 'g',
    '5000 grams': 'g',
    '1000 grams': 'g',
    '750 grams': 'g',
    '454 grams': 'g',
    '500 grams': 'g',
    '680 grams': 'g',
    '6000 grams': 'g',
    '630 grams': 'g',
    
    // Volume units
    '1 liter': 'liters',
    '1 litre': 'liters',
    'liter': 'liters',
    'liters': 'liters',
    'litre': 'liters',
    'litres': 'liters',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    
    // Count units
    'piece': 'pieces',
    'pieces': 'pieces',
    'pcs': 'pieces',
    'pc': 'pieces',
    
    // Box/Package units
    '1 box': 'boxes',
    'box': 'boxes',
    'boxes': 'boxes',
    'pack': 'packs',
    'packs': 'packs',
    'pack of 25': 'packs',
    'pack of 50': 'packs',
    'pack of 100': 'packs',
    'pack of 20': 'packs',
    'pack of 32': 'packs',
    'pack of 24': 'packs',
    'pack of 27': 'packs'
  };
  
  const normalizedInput = unit.toLowerCase().trim();
  return unitMapping[normalizedInput] || 'pieces'; // Default to pieces if not found
};

export const bulkUploadRawIngredients = async (ingredients: RawIngredientUpload[]): Promise<boolean> => {
  try {
    console.log('Starting bulk upload of ingredients:', ingredients);
    
    // First, get existing suppliers to match names
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name');

    const supplierMap = new Map(suppliers?.map(s => [s.name.toLowerCase(), s.id]) || []);

    const processedIngredients = ingredients.map(ingredient => {
      // Validate category values
      const validCategories = ['raw_materials', 'packaging_materials', 'supplies'];
      if (!validCategories.includes(ingredient.category)) {
        console.warn(`Invalid category "${ingredient.category}" for ingredient "${ingredient.name}". Defaulting to "raw_materials".`);
        ingredient.category = 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies';
      }

      // Normalize the unit value to match database constraints
      const normalizedUnit = normalizeUnitValue(ingredient.uom);
      console.log(`Normalizing unit "${ingredient.uom}" to "${normalizedUnit}" for ingredient "${ingredient.name}"`);

      // Determine item_type based on category
      let item_type: 'raw_material' | 'supply' = 'raw_material';
      if (ingredient.category === 'packaging_materials' || ingredient.category === 'supplies') {
        item_type = 'supply';
      }

      return {
        name: ingredient.name,
        category: ingredient.category as 'raw_materials' | 'packaging_materials' | 'supplies',
        item_type: item_type,
        unit: normalizedUnit, // Use normalized unit value
        unit_cost: ingredient.unit_cost || 0,
        item_price: ingredient.item_price, // Include item_price
        item_quantity: ingredient.item_quantity, // Include item_quantity
        current_stock: ingredient.current_stock || 0,
        minimum_threshold: ingredient.minimum_threshold || 0,
        supplier_id: ingredient.supplier_name ? supplierMap.get(ingredient.supplier_name.toLowerCase()) : null,
        sku: ingredient.sku,
        storage_location: ingredient.storage_location,
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
    
    toast.success(`Successfully uploaded ${ingredients.length} raw ingredients`);
    return true;
  } catch (error) {
    console.error('Error bulk uploading ingredients:', error);
    
    // More specific error message based on the error type
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === '23514') {
        toast.error('Invalid unit values in CSV. Units have been normalized to match database constraints.');
      } else {
        toast.error(`Database error: ${error.message || 'Unknown error'}`);
      }
    } else {
      toast.error('Failed to upload raw ingredients');
    }
    return false;
  }
};
