import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";

export interface InventoryAlert {
  id: string;
  item: string;
  unit: string;
  currentStock: number;
  minimumThreshold?: number;
  alertType: 'low_stock' | 'out_of_stock' | 'reorder_point';
  category?: string;
}

export interface InventoryMovement {
  id: string;
  item: string;
  unit: string;
  transactionType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  timestamp: string;
  notes?: string;
}

export interface CashierInventoryStatus {
  alerts: InventoryAlert[];
  movements: InventoryMovement[];
  currentStockLevels: Array<{
    id: string;
    item: string;
    unit: string;
    currentStock: number;
    cost?: number;
    category?: string;
  }>;
  soldItems: Array<{
    item: string;
    quantitySold: number;
    totalValue: number;
  }>;
}

export async function fetchCashierInventoryStatus(
  storeId: string,
  userId?: string,
  date: Date = new Date()
): Promise<CashierInventoryStatus> {
  try {
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);

    // Get current inventory stock levels with alerts
    const { data: stockData, error: stockError } = await supabase
      .from('inventory_stock')
      .select(`
        id,
        item,
        unit,
        stock_quantity,
        cost
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('item');

    if (stockError) throw stockError;

    // Get inventory alerts
    const { data: alertsData, error: alertsError } = await supabase
      .from('store_inventory_alerts')
      .select(`
        id,
        alert_type,
        threshold_quantity,
        current_quantity,
        inventory_stock_id,
        inventory_stock:inventory_stock_id (
          item,
          unit
        )
      `)
      .eq('store_id', storeId)
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false });

    if (alertsError) throw alertsError;

    // Get inventory movements for the day
    const { data: movementsData, error: movementsError } = await supabase
      .from('inventory_transactions')
      .select(`
        id,
        transaction_type,
        quantity,
        previous_quantity,
        new_quantity,
        created_at,
        notes,
        inventory_stock:product_id (
          item,
          unit
        )
      `)
      .eq('store_id', storeId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (movementsError) throw movementsError;

    // For now, we'll skip sold items data as the table structure needs verification
    const soldItemsData: any[] = [];

    // Process alerts
    const alerts: InventoryAlert[] = (alertsData || []).map(alert => ({
      id: alert.id,
      item: alert.inventory_stock?.item || 'Unknown Item',
      unit: alert.inventory_stock?.unit || '',
      currentStock: alert.current_quantity,
      minimumThreshold: alert.threshold_quantity,
      alertType: alert.alert_type as 'low_stock' | 'out_of_stock' | 'reorder_point'
    }));

    // Process movements
    const movements: InventoryMovement[] = (movementsData || []).map(movement => ({
      id: movement.id,
      item: movement.inventory_stock?.item || 'Unknown Item',
      unit: movement.inventory_stock?.unit || '',
      transactionType: movement.transaction_type,
      quantity: Math.abs(movement.quantity),
      previousQuantity: movement.previous_quantity,
      newQuantity: movement.new_quantity,
      timestamp: movement.created_at,
      notes: movement.notes
    }));

    // Process current stock levels
    const currentStockLevels = (stockData || []).map(stock => ({
      id: stock.id,
      item: stock.item,
      unit: stock.unit,
      currentStock: stock.stock_quantity,
      cost: stock.cost
    }));

    // Simplified sold items - can be enhanced later with proper transaction item tracking
    const soldItems: Array<{ item: string; quantitySold: number; totalValue: number }> = [];

    return {
      alerts,
      movements,
      currentStockLevels,
      soldItems
    };

  } catch (error) {
    console.error('Error fetching cashier inventory status:', error);
    throw error;
  }
}

export async function acknowledgeInventoryAlert(alertId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('store_inventory_alerts')
      .update({ 
        is_acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', alertId);

    if (error) throw error;
  } catch (error) {
    console.error('Error acknowledging inventory alert:', error);
    throw error;
  }
}