
import { supabase } from "@/integrations/supabase/client";
import { InventoryReport } from "@/types/reports";
import { toast } from "sonner";

export async function fetchInventoryReport(
  storeId: string,
  from: string,
  to: string
): Promise<InventoryReport | null> {
  try {
    // Fetch current inventory items
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, sku, stock_quantity")
      .eq("store_id", storeId)
      .order("name");

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      return null;
    }

    // Fetch inventory transactions to calculate sold units in the date range
    const { data: inventoryTransactions, error: txError } = await supabase
      .from("inventory_transactions")
      .select("product_id, quantity, transaction_type")
      .eq("store_id", storeId)
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`);

    if (txError) {
      throw txError;
    }

    // Calculate current inventory status
    const inventoryItems = products.map(product => {
      // Find transactions for this product
      const productTransactions = inventoryTransactions?.filter(
        tx => tx.product_id === product.id
      ) || [];
      
      // Calculate sold units from transactions
      const soldUnits = productTransactions
        .filter(tx => tx.transaction_type === 'sale')
        .reduce((sum, tx) => sum + tx.quantity, 0);
      
      // Calculate initial stock by adding sold units to current stock
      const initialStock = product.stock_quantity + soldUnits;
      
      return {
        name: product.name,
        sku: product.sku,
        initialStock,
        currentStock: product.stock_quantity,
        soldUnits,
        threshold: 10 // Default threshold for low stock warning
      };
    });

    // Calculate summary statistics
    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => 
      item.currentStock > 0 && item.currentStock <= 10
    ).length;
    const outOfStockItems = inventoryItems.filter(item => 
      item.currentStock <= 0
    ).length;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      inventoryItems
    };
  } catch (error) {
    console.error("Error fetching inventory report:", error);
    toast.error("Failed to load inventory report");
    return null;
  }
}
