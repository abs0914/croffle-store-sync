
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryMovement {
  id: string;
  inventory_stock_id: string;
  movement_type: 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'restock' | 'damage' | 'expire';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  inventory_stock?: {
    item: string;
    unit: string;
  };
}

export const fetchInventoryMovements = async (
  storeId: string, 
  filters?: {
    itemId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<InventoryMovement[]> => {
  try {
    let query = supabase
      .from('inventory_movements')
      .select(`
        *,
        inventory_stock:inventory_stock(item, unit, store_id)
      `)
      .order('created_at', { ascending: false });

    // Filter by store through inventory_stock
    if (storeId) {
      const { data: storeItems } = await supabase
        .from('inventory_stock')
        .select('id')
        .eq('store_id', storeId);
      
      const itemIds = storeItems?.map(item => item.id) || [];
      if (itemIds.length > 0) {
        query = query.in('inventory_stock_id', itemIds);
      }
    }

    if (filters?.itemId) {
      query = query.eq('inventory_stock_id', filters.itemId);
    }

    if (filters?.movementType) {
      query = query.eq('movement_type', filters.movementType);
    }

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      movement_type: item.movement_type as 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'restock' | 'damage' | 'expire'
    }));
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    toast.error('Failed to fetch inventory movements');
    return [];
  }
};

export const createInventoryMovement = async (movement: {
  inventory_stock_id: string;
  movement_type: InventoryMovement['movement_type'];
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('inventory_movements')
      .insert({
        ...movement,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating inventory movement:', error);
    toast.error('Failed to record inventory movement');
    return false;
  }
};

export const transferInventoryBetweenStores = async (
  fromStoreId: string,
  toStoreId: string,
  inventoryItemId: string,
  quantity: number,
  notes?: string
): Promise<boolean> => {
  try {
    // First, get the source item details
    const { data: sourceItem, error: sourceError } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('id', inventoryItemId)
      .eq('store_id', fromStoreId)
      .single();

    if (sourceError || !sourceItem) {
      throw new Error('Source inventory item not found');
    }

    if (sourceItem.stock_quantity < quantity) {
      throw new Error('Insufficient stock for transfer');
    }

    // Use the database function for transfer
    const { error: transferError } = await supabase.rpc('transfer_inventory_stock', {
      p_source_id: inventoryItemId,
      p_target_store_id: toStoreId,
      p_item: sourceItem.item,
      p_unit: sourceItem.unit,
      p_quantity: quantity,
      p_notes: notes || 'Store to store transfer',
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    });

    if (transferError) throw transferError;

    toast.success('Inventory transfer completed successfully');
    return true;
  } catch (error) {
    console.error('Error transferring inventory:', error);
    toast.error(`Failed to transfer inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};
