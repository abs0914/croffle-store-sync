
import { supabase } from "@/integrations/supabase/client";
import { StockReport } from "@/types/reports";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export async function fetchStockReport(
  storeId: string,
  from: string,
  to: string
): Promise<StockReport | null> {
  try {
    // Fetch inventory stock items
    const { data: stockItems, error: stockError } = await supabase
      .from("inventory_stock")
      .select("*")
      .eq("store_id", storeId)
      .order("item");

    if (stockError) {
      throw stockError;
    }

    // Fetch all inventory transactions for the period
    const { data: transactions, error: txError } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("store_id", storeId)
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at");

    if (txError) {
      throw txError;
    }

    // Fetch shifts with inventory counts
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("id, user_id, start_time, end_time, start_inventory_count, end_inventory_count")
      .eq("store_id", storeId)
      .gte("start_time", `${from}T00:00:00`)
      .lte("start_time", `${to}T23:59:59`)
      .order("start_time");

    if (shiftsError) {
      throw shiftsError;
    }

    // Since we don't have direct access to a profiles table, we'll use user IDs directly
    // and create a simple mapping function to format them
    const userIds = [...new Set(shifts.map(shift => shift.user_id))];
    const userMap: Record<string, string> = {};
    
    userIds.forEach(userId => {
      // Create a simple formatted user ID when we don't have access to names
      userMap[userId] = `User ${userId.substring(0, 5)}`;
    });

    // Process stock items with their transactions
    const stockItemsData = stockItems.map(item => {
      // Get transactions for this item
      const itemTransactions = transactions.filter(tx => tx.product_id === item.id)
        .map(tx => ({
          date: format(parseISO(tx.created_at), 'yyyy-MM-dd HH:mm'),
          type: tx.transaction_type,
          quantity: tx.quantity,
          previousStock: tx.previous_quantity,
          newStock: tx.new_quantity
        }));

      // Calculate consumed amount from transactions
      const consumed = itemTransactions.reduce((total, tx) => {
        if (tx.type === 'adjustment' && tx.newStock < tx.previousStock) {
          return total + (tx.previousStock - tx.newStock);
        }
        return total;
      }, 0);

      // Calculate initial stock at beginning of period
      let initialStock = item.stock_quantity;
      if (itemTransactions.length > 0) {
        // Go through transactions backward and undo them to get initial stock
        initialStock = itemTransactions.reduce((prevStock, tx) => {
          if (tx.type === 'adjustment') {
            return tx.previousStock;
          }
          return prevStock;
        }, item.stock_quantity);
      }

      return {
        id: item.id,
        name: item.item,
        unit: item.unit,
        currentStock: item.stock_quantity,
        initialStock,
        consumed,
        threshold: 10, // Default threshold
        lastUpdated: item.updated_at ? format(parseISO(item.updated_at), 'yyyy-MM-dd HH:mm') : 'N/A',
        transactions: itemTransactions
      };
    });

    // Process shift data with inventory counts - ensuring we cast JSON to appropriate types
    const shiftData = shifts.map(shift => {
      // Ensure the inventory counts are properly cast to Record<string, number>
      const startInventory: Record<string, number> = shift.start_inventory_count ? 
        (typeof shift.start_inventory_count === 'object' ? 
          Object.fromEntries(Object.entries(shift.start_inventory_count).map(([key, value]) => 
            [key, typeof value === 'number' ? value : Number(value)])) : {}) : {};
      
      const endInventory: Record<string, number> | null = shift.end_inventory_count ? 
        (typeof shift.end_inventory_count === 'object' ? 
          Object.fromEntries(Object.entries(shift.end_inventory_count).map(([key, value]) => 
            [key, typeof value === 'number' ? value : Number(value)])) : null) : null;

      return {
        shiftId: shift.id,
        userId: shift.user_id,
        userName: userMap[shift.user_id] || `User ${shift.user_id.substring(0, 5)}`,
        startTime: format(parseISO(shift.start_time), 'yyyy-MM-dd HH:mm'),
        endTime: shift.end_time ? format(parseISO(shift.end_time), 'yyyy-MM-dd HH:mm') : null,
        startInventory,
        endInventory
      };
    });

    // Calculate summary statistics
    const totalItems = stockItemsData.length;
    const lowStockItems = stockItemsData.filter(item => 
      item.currentStock > 0 && item.currentStock <= 10
    ).length;
    const outOfStockItems = stockItemsData.filter(item => 
      item.currentStock <= 0
    ).length;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      stockItems: stockItemsData,
      shiftData
    };
  } catch (error) {
    console.error("Error fetching stock report:", error);
    toast.error("Failed to load stock report");
    return null;
  }
}
