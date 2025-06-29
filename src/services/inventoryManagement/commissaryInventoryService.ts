
import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem } from "@/types/commissary"; // Use commissary types instead
import { toast } from "sonner";

// Helper function to map units to valid database units
const mapToValidUnit = (unit: string): string => {
  const unitMapping: Record<string, string> = {
    // Weight units
    'kg': 'kg',
    'kilo': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    
    // Volume units
    'l': 'liters',
    'liter': 'liters',
    'liters': 'liters',
    'litre': 'liters',
    'litres': 'liters',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'millilitre': 'ml',
    'millilitres': 'ml',
    
    // Count units
    'piece': 'pieces',
    'pieces': 'pieces',
    'pcs': 'pieces',
    'pc': 'pieces',
    'item': 'pieces',
    'items': 'pieces',
    'unit': 'pieces',
    'units': 'pieces',
    
    // Package units
    'box': 'boxes',
    'boxes': 'boxes',
    'pack': 'packs',
    'packs': 'packs',
    'package': 'packs',
    'packages': 'packs',
    
    // Special units
    'serving': 'serving',
    'servings': 'serving',
    'portion': 'portion',
    'portions': 'portion',
    'scoop': 'scoop',
    'scoops': 'scoop',
    'pair': 'pair',
    'pairs': 'pair'
  };
  
  const normalizedUnit = unit.toLowerCase().trim();
  return unitMapping[normalizedUnit] || 'pieces'; // Default to pieces if not found
};

export const fetchCommissaryInventory = async (filters?: any): Promise<CommissaryInventoryItem[]> => {
  try {
    let query = supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('name');

    // Apply filters if provided
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters?.supplier) {
      query = query.eq('supplier_id', filters.supplier);
    }
    if (filters?.item_type && filters.item_type !== 'all') {
      query = query.eq('item_type', filters.item_type);
    }

    const { data, error } = await query;

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

export const createCommissaryInventoryItem = async (item: Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
  try {
    // Map uom to valid unit for database compatibility
    const dbItem = {
      name: item.name,
      category: item.category,
      item_type: item.item_type,
      current_stock: item.current_stock,
      minimum_threshold: item.minimum_threshold,
      unit: mapToValidUnit(item.uom), // Store mapped unit in database
      unit_cost: item.unit_cost,
      supplier_id: item.supplier_id,
      sku: item.sku,
      barcode: item.barcode,
      expiry_date: item.expiry_date,
      storage_location: item.storage_location,
      is_active: item.is_active
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

export const updateCommissaryInventoryItem = async (
  id: string, 
  updates: Partial<Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  try {
    // Map uom to unit for database compatibility and exclude uom from database update
    const { uom, ...otherUpdates } = updates;
    const dbUpdates = {
      ...otherUpdates,
      ...(uom && { unit: mapToValidUnit(uom) }) // Map and include unit if uom is provided
    };
    
    const { error } = await supabase
      .from('commissary_inventory')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;
    toast.success('Commissary item updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating commissary item:', error);
    toast.error('Failed to update commissary item');
    return false;
  }
};

export const deleteCommissaryInventoryItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_inventory')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    toast.success('Commissary item deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting commissary item:', error);
    toast.error('Failed to delete commissary item');
    return false;
  }
};

export const adjustCommissaryInventoryStock = async (
  id: string,
  newStock: number,
  reason: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_inventory')
      .update({ 
        current_stock: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    toast.success('Stock adjusted successfully');
    return true;
  } catch (error) {
    console.error('Error adjusting stock:', error);
    toast.error('Failed to adjust stock');
    return false;
  }
};

export const getCommissaryStockLevel = (item: CommissaryInventoryItem): 'good' | 'low' | 'out' => {
  if (item.current_stock <= 0) return 'out';
  if (item.current_stock <= item.minimum_threshold) return 'low';
  return 'good';
};

export const getCommissaryStockLevelColor = (level: 'good' | 'low' | 'out'): string => {
  switch (level) {
    case 'good': return 'text-green-600';
    case 'low': return 'text-yellow-600';
    case 'out': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export const removeDuplicateCommissaryItems = async (): Promise<boolean> => {
  try {
    console.log('Starting duplicate removal process...');
    
    // First, get all commissary inventory items
    const { data: allItems, error: fetchError } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true }); // Keep oldest items

    if (fetchError) throw fetchError;

    if (!allItems || allItems.length === 0) {
      toast.info('No items found to check for duplicates');
      return true;
    }

    console.log('Found items to check:', allItems.length);

    // Group items by name and category to find duplicates
    const itemGroups = new Map<string, any[]>();
    
    allItems.forEach(item => {
      const key = `${item.name.toLowerCase().trim()}-${item.category}`;
      if (!itemGroups.has(key)) {
        itemGroups.set(key, []);
      }
      itemGroups.get(key)!.push(item);
    });

    // Find duplicates and mark for deletion
    const itemsToDelete: string[] = [];
    let duplicatesFound = 0;

    itemGroups.forEach((items, key) => {
      if (items.length > 1) {
        console.log(`Found ${items.length} duplicates for: ${key}`, items.map(i => ({ id: i.id, name: i.name, unit: i.unit, stock: i.current_stock })));
        
        // Keep the first item (oldest), mark others for deletion
        const itemsToKeep = items.slice(0, 1);
        const itemsToRemove = items.slice(1);
        
        // Combine stock from duplicates into the item we're keeping
        const totalStock = items.reduce((sum, item) => sum + (item.current_stock || 0), 0);
        const keepItem = itemsToKeep[0];
        
        // Update the kept item with combined stock
        if (totalStock !== keepItem.current_stock) {
          console.log(`Combining stock for ${keepItem.name}: ${keepItem.current_stock} + ${totalStock - keepItem.current_stock} = ${totalStock}`);
        }

        // Mark duplicates for deletion
        itemsToRemove.forEach(item => {
          itemsToDelete.push(item.id);
          duplicatesFound++;
        });
      }
    });

    if (itemsToDelete.length === 0) {
      toast.info('No duplicates found');
      return true;
    }

    console.log(`Removing ${itemsToDelete.length} duplicate items...`, itemsToDelete);

    // Delete duplicates from database
    const { error: deleteError } = await supabase
      .from('commissary_inventory')
      .update({ is_active: false })
      .in('id', itemsToDelete);

    if (deleteError) throw deleteError;

    toast.success(`Successfully removed ${duplicatesFound} duplicate items`);
    return true;
    
  } catch (error) {
    console.error('Error removing duplicates:', error);
    toast.error('Failed to remove duplicates');
    return false;
  }
};

export const fetchOrderableItems = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    console.log('Fetching orderable items...');
    
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .eq('item_type', 'orderable_item') // Only fetch converted/finished products
      .gte('current_stock', 0) // Changed from gt to gte to include items with 0 stock
      .order('name');

    if (error) {
      console.error('Error fetching orderable items:', error);
      throw error;
    }
    
    console.log('Raw orderable items from DB:', data);
    console.log('Query used: is_active = true, item_type = orderable_item, current_stock >= 0');
    
    if (!data || data.length === 0) {
      console.log('No orderable items found. Checking all commissary items...');
      
      // Enhanced debug query to see ALL items regardless of is_active status
      const { data: allItems } = await supabase
        .from('commissary_inventory')
        .select('id, name, item_type, is_active, current_stock, category')
        .order('name');
      
      console.log('ALL commissary items (including inactive):', allItems);
      console.log('Active items:', allItems?.filter(item => item.is_active));
      console.log('Items with orderable_item type:', allItems?.filter(item => item.item_type === 'orderable_item'));
      console.log('Active orderable items:', allItems?.filter(item => item.item_type === 'orderable_item' && item.is_active));
      
      // Show breakdown by item_type
      const itemTypeBreakdown = allItems?.reduce((acc, item) => {
        acc[item.item_type] = (acc[item.item_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('Item type breakdown:', itemTypeBreakdown);
    }
    
    const processedItems = (data || []).map(item => ({
      ...item,
      uom: item.unit || 'units',
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      item_type: item.item_type as 'raw_material' | 'supply' | 'orderable_item'
    }));
    
    console.log('Processed orderable items:', processedItems);
    console.log('Total orderable items found:', processedItems.length);
    
    return processedItems;
  } catch (error) {
    console.error('Error fetching orderable items:', error);
    toast.error('Failed to fetch orderable items');
    return [];
  }
};
