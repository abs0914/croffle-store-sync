
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const checkLocalStorageForCommissaryData = () => {
  console.log('=== Checking for local commissary data ===');
  
  // Check common localStorage keys that might contain commissary data
  const possibleKeys = [
    'commissary_inventory',
    'commissaryItems',
    'orderableItems',
    'inventory_items',
    'products',
    'catalog_items'
  ];
  
  const foundData: Record<string, any> = {};
  
  possibleKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        foundData[key] = parsed;
        console.log(`Found data in localStorage['${key}']:`, parsed);
      } catch (e) {
        console.log(`Found non-JSON data in localStorage['${key}']:`, data);
        foundData[key] = data;
      }
    }
  });
  
  // Also check sessionStorage
  possibleKeys.forEach(key => {
    const data = sessionStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        foundData[`session_${key}`] = parsed;
        console.log(`Found data in sessionStorage['${key}']:`, parsed);
      } catch (e) {
        console.log(`Found non-JSON data in sessionStorage['${key}']:`, data);
        foundData[`session_${key}`] = data;
      }
    }
  });
  
  return foundData;
};

export const syncLocalDataToSupabase = async (localData: any[]) => {
  console.log('Starting sync of local data to Supabase...');
  
  try {
    const itemsToSync = localData.map(item => ({
      name: item.name || item.product_name || 'Unknown Item',
      category: item.category || 'supplies',
      item_type: 'orderable_item', // This is the key fix!
      current_stock: item.current_stock || item.stock_quantity || 0,
      minimum_threshold: item.minimum_threshold || 5,
      unit: item.unit || item.uom || 'pieces',
      unit_cost: item.unit_cost || item.price || 0,
      supplier_id: item.supplier_id || null,
      sku: item.sku || null,
      barcode: item.barcode || null,
      expiry_date: item.expiry_date || null,
      storage_location: item.storage_location || null,
      is_active: true
    }));
    
    console.log('Items prepared for sync:', itemsToSync);
    
    const { data, error } = await supabase
      .from('commissary_inventory')
      .insert(itemsToSync)
      .select();
    
    if (error) {
      console.error('Error syncing to Supabase:', error);
      toast.error('Failed to sync data to database');
      return false;
    }
    
    console.log('Successfully synced items:', data);
    toast.success(`Successfully synced ${data.length} items to commissary inventory`);
    return true;
  } catch (error) {
    console.error('Sync error:', error);
    toast.error('Failed to sync data');
    return false;
  }
};

export const updateExistingItemsToOrderable = async () => {
  console.log('Updating existing commissary items to be orderable...');
  
  try {
    // First, let's see what items exist
    const { data: existingItems, error: fetchError } = await supabase
      .from('commissary_inventory')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching existing items:', fetchError);
      return false;
    }
    
    console.log('Existing commissary items:', existingItems);
    
    if (!existingItems || existingItems.length === 0) {
      console.log('No existing items to update');
      return false;
    }
    
    // Update items that should be orderable (you can adjust this logic)
    const { data, error } = await supabase
      .from('commissary_inventory')
      .update({ 
        item_type: 'orderable_item',
        is_active: true 
      })
      .neq('item_type', 'orderable_item') // Only update non-orderable items
      .select();
    
    if (error) {
      console.error('Error updating items:', error);
      toast.error('Failed to update items');
      return false;
    }
    
    console.log('Updated items to orderable:', data);
    toast.success(`Updated ${data?.length || 0} items to be orderable`);
    return true;
  } catch (error) {
    console.error('Update error:', error);
    toast.error('Failed to update items');
    return false;
  }
};
