
import { supabase } from "@/integrations/supabase/client";
import { InventoryStock } from "@/types";
import { toast } from "sonner";

// Fetch all inventory stock items for a store
export const fetchInventoryStock = async (storeId: string): Promise<InventoryStock[]> => {
  try {
    // Use type assertion to handle the inventory_stock table
    const { data, error } = await supabase
      .from('inventory_stock')
      .select("*")
      .eq("store_id", storeId)
      .order("item");
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data as unknown as InventoryStock[];
  } catch (error) {
    console.error("Error fetching inventory stock:", error);
    toast.error("Failed to load inventory stock");
    return [];
  }
};

// Fetch a single inventory stock item
export const fetchInventoryStockItem = async (id: string): Promise<InventoryStock | null> => {
  try {
    // Use type assertion to handle the inventory_stock table
    const { data, error } = await supabase
      .from('inventory_stock')
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return data as unknown as InventoryStock;
  } catch (error) {
    console.error("Error fetching inventory stock item:", error);
    toast.error("Failed to load inventory stock item details");
    return null;
  }
};
