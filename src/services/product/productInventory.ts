
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Inventory transactions
export const createInventoryTransaction = async (transaction: {
  store_id: string;
  product_id: string;
  variation_id?: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string;
  notes?: string;
  created_by: string;
}): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("inventory_transactions")
      .insert(transaction);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Inventory updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating inventory:", error);
    toast.error("Failed to update inventory");
    return false;
  }
};

export const fetchInventoryTransactions = async (
  storeId: string,
  productId?: string,
  variationId?: string,
  limit = 50
): Promise<any[]> => {
  try {
    let query = supabase
      .from("inventory_transactions")
      .select("*, products:product_id(name)")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (productId) {
      query = query.eq("product_id", productId);
    }
    
    if (variationId) {
      query = query.eq("variation_id", variationId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    toast.error("Failed to load inventory history");
    return [];
  }
};
