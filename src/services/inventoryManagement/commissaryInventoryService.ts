import { supabase } from "@/integrations/supabase/client";
import { CommissaryInventoryItem, CommissaryInventoryFilters } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchCommissaryInventory = async (filters?: CommissaryInventoryFilters): Promise<CommissaryInventoryItem[]> => {
  try {
    let query = supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('name');

    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.supplier) {
      query = query.eq('supplier_id', filters.supplier);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch suppliers separately if we have items with supplier_ids
    const supplierIds = (data || []).map(item => item.supplier_id).filter(Boolean);
    let suppliers: any[] = [];
    
    if (supplierIds.length > 0) {
      const { data: suppliersData } = await supabase
        .from('suppliers')
        .select('*')
        .in('id', supplierIds);
      
      suppliers = suppliersData || [];
    }

    // Process the data and manually join supplier information
    return (data || []).map(item => {
      const supplier = suppliers.find(s => s.id === item.supplier_id) || null;

      return {
        ...item,
        category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
        unit: item.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
        supplier: supplier
      };
    });
  } catch (error) {
    console.error('Error fetching commissary inventory:', error);
    toast.error('Failed to fetch commissary inventory');
    return [];
  }
};

export const createCommissaryInventoryItem = async (
  item: Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at' | 'supplier'>
): Promise<CommissaryInventoryItem | null> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .insert({
        name: item.name,
        category: item.category,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        unit: item.unit,
        unit_cost: item.unit_cost,
        supplier_id: item.supplier_id,
        sku: item.sku,
        barcode: item.barcode,
        expiry_date: item.expiry_date,
        storage_location: item.storage_location,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    // Fetch supplier data if exists
    let supplier = null;
    if (data.supplier_id) {
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', data.supplier_id)
        .single();
      
      supplier = supplierData;
    }

    toast.success('Commissary inventory item created successfully');
    return {
      ...data,
      category: data.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      unit: data.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
      supplier: supplier
    };
  } catch (error) {
    console.error('Error creating commissary inventory item:', error);
    toast.error('Failed to create commissary inventory item');
    return null;
  }
};

export const updateCommissaryInventoryItem = async (
  id: string,
  updates: Partial<Omit<CommissaryInventoryItem, 'id' | 'created_at' | 'updated_at' | 'supplier'>>
): Promise<CommissaryInventoryItem | null> => {
  try {
    // Clean the updates object to remove the supplier property if it exists
    const { supplier, ...cleanUpdates } = updates as any;
    
    const { data, error } = await supabase
      .from('commissary_inventory')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Fetch supplier data if exists
    let supplierData = null;
    if (data.supplier_id) {
      const { data: fetchedSupplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', data.supplier_id)
        .single();
      
      supplierData = fetchedSupplier;
    }

    toast.success('Commissary inventory item updated successfully');
    return {
      ...data,
      category: data.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      unit: data.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
      supplier: supplierData
    };
  } catch (error) {
    console.error('Error updating commissary inventory item:', error);
    toast.error('Failed to update commissary inventory item');
    return null;
  }
};

export const deleteCommissaryInventoryItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Commissary inventory item deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting commissary inventory item:', error);
    toast.error('Failed to delete commissary inventory item');
    return false;
  }
};

export const removeDuplicateCommissaryItems = async (): Promise<boolean> => {
  try {
    // Fetch all active commissary items
    const { data: items, error: fetchError } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    if (!items || items.length === 0) {
      toast.info('No items found to deduplicate');
      return true;
    }

    // Group items by name (case-insensitive) and category
    const itemGroups = new Map<string, typeof items>();
    
    items.forEach(item => {
      const key = `${item.name.toLowerCase().trim()}-${item.category}`;
      if (!itemGroups.has(key)) {
        itemGroups.set(key, []);
      }
      itemGroups.get(key)!.push(item);
    });

    // Find duplicates and merge them
    let duplicatesFound = 0;
    let itemsRemoved = 0;

    for (const [key, group] of itemGroups) {
      if (group.length > 1) {
        duplicatesFound++;
        
        // Sort by created_at to keep the oldest item
        group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        const keepItem = group[0]; // Keep the first (oldest) item
        const duplicateItems = group.slice(1); // Remove the rest
        
        // Sum up the stock quantities from duplicates
        const totalStock = group.reduce((sum, item) => sum + (item.current_stock || 0), 0);
        
        // Update the kept item with the total stock
        const { error: updateError } = await supabase
          .from('commissary_inventory')
          .update({
            current_stock: totalStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', keepItem.id);

        if (updateError) {
          console.error(`Error updating item ${keepItem.name}:`, updateError);
          continue;
        }

        // Delete the duplicate items
        for (const duplicateItem of duplicateItems) {
          const { error: deleteError } = await supabase
            .from('commissary_inventory')
            .delete()
            .eq('id', duplicateItem.id);

          if (deleteError) {
            console.error(`Error deleting duplicate item ${duplicateItem.name}:`, deleteError);
          } else {
            itemsRemoved++;
          }
        }
      }
    }

    if (duplicatesFound === 0) {
      toast.info('No duplicate items found');
    } else {
      toast.success(`Successfully removed ${itemsRemoved} duplicate items and consolidated ${duplicatesFound} item groups`);
    }

    return true;
  } catch (error) {
    console.error('Error removing duplicate commissary items:', error);
    toast.error('Failed to remove duplicate items');
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
      .update({ current_stock: newStock })
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
  if (item.current_stock === 0) return 'out';
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
