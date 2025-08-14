import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryAlert {
  id: string;
  item: string;
  currentStock: number;
  minimumThreshold: number;
  status: 'low_stock' | 'out_of_stock' | 'critical';
}

export interface InventoryListener {
  unsubscribe: () => void;
}

/**
 * Real-time inventory monitoring service for POS
 * Provides live stock updates and alerts
 */
export class RealTimeInventoryService {
  private static listeners = new Map<string, any>();
  
  /**
   * Sets up real-time inventory monitoring for a store
   */
  static setupInventoryMonitoring(
    storeId: string,
    onStockUpdate: (alerts: InventoryAlert[]) => void,
    onCriticalAlert: (alert: InventoryAlert) => void
  ): InventoryListener {
    console.log('🔄 Setting up real-time inventory monitoring for store:', storeId);
    
    const channelName = `inventory-${storeId}`;
    
    // Remove existing listener if any
    this.removeListener(channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'inventory_stock',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          console.log('📦 Inventory change detected:', payload);
          await this.handleInventoryChange(payload, storeId, onStockUpdate, onCriticalAlert);
        }
      )
      .subscribe((status) => {
        console.log('📡 Inventory monitoring status:', status);
      });
    
    this.listeners.set(channelName, channel);
    
    // Initial stock check
    this.checkCurrentInventoryStatus(storeId, onStockUpdate, onCriticalAlert);
    
    return {
      unsubscribe: () => this.removeListener(channelName)
    };
  }
  
  /**
   * Handles inventory change events
   */
  private static async handleInventoryChange(
    payload: any,
    storeId: string,
    onStockUpdate: (alerts: InventoryAlert[]) => void,
    onCriticalAlert: (alert: InventoryAlert) => void
  ) {
    try {
      const eventType = payload.eventType;
      const newRecord = payload.new;
      const oldRecord = payload.old;
      
      console.log('Processing inventory change:', { eventType, newRecord, oldRecord });
      
      // Check for critical stock changes
      if (eventType === 'UPDATE' && newRecord) {
        const oldStock = oldRecord?.stock_quantity || 0;
        const newStock = newRecord.stock_quantity || 0;
        const threshold = newRecord.minimum_threshold || 10;
        
        // Stock decreased significantly
        if (newStock < oldStock) {
          const alert: InventoryAlert = {
            id: newRecord.id,
            item: newRecord.item,
            currentStock: newStock,
            minimumThreshold: threshold,
            status: newStock <= 0 ? 'out_of_stock' : 
                   newStock <= threshold ? 'low_stock' : 'critical'
          };
          
          // Trigger critical alert for immediate attention
          if (newStock <= 0) {
            onCriticalAlert(alert);
            toast.error(`⚠️ OUT OF STOCK: ${newRecord.item}`);
          } else if (newStock <= threshold && oldStock > threshold) {
            onCriticalAlert(alert);
            toast.warning(`⚠️ LOW STOCK: ${newRecord.item} (${newStock} remaining)`);
          }
        }
      }
      
      // Refresh overall inventory status
      await this.checkCurrentInventoryStatus(storeId, onStockUpdate, onCriticalAlert);
      
    } catch (error) {
      console.error('Error handling inventory change:', error);
    }
  }
  
  /**
   * Checks current inventory status and generates alerts
   */
  static async checkCurrentInventoryStatus(
    storeId: string,
    onStockUpdate: (alerts: InventoryAlert[]) => void,
    onCriticalAlert?: (alert: InventoryAlert) => void
  ) {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('stock_quantity', { ascending: true });
      
      if (error) throw error;
      
      const alerts: InventoryAlert[] = [];
      
      inventory?.forEach(item => {
        const threshold = item.minimum_threshold || 10;
        const stock = item.stock_quantity || 0;
        
        if (stock <= 0) {
          alerts.push({
            id: item.id,
            item: item.item,
            currentStock: stock,
            minimumThreshold: threshold,
            status: 'out_of_stock'
          });
        } else if (stock <= threshold) {
          alerts.push({
            id: item.id,
            item: item.item,
            currentStock: stock,
            minimumThreshold: threshold,
            status: stock <= threshold * 0.5 ? 'critical' : 'low_stock'
          });
        }
      });
      
      // Send updates to callback
      onStockUpdate(alerts);
      
      console.log(`📊 Inventory status check complete: ${alerts.length} alerts for store ${storeId}`);
      
    } catch (error) {
      console.error('Error checking inventory status:', error);
      toast.error('Failed to check inventory status');
    }
  }
  
  /**
   * Validates if products can be sold based on current stock
   */
  static async validateProductsForSale(
    storeId: string,
    items: { productId: string; quantity: number }[]
  ): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const { validateProductAvailability } = await import('@/services/productCatalog/inventoryIntegrationService');
      
      const errors: string[] = [];
      
      for (const item of items) {
        const validation = await validateProductAvailability(item.productId, item.quantity);
        if (!validation.isValid) {
          errors.push(`${item.productId}: ${validation.insufficientItems.join(', ')}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
      
    } catch (error) {
      console.error('Error validating products for sale:', error);
      return {
        isValid: false,
        errors: ['Validation service error']
      };
    }
  }
  
  /**
   * Removes a specific listener
   */
  private static removeListener(channelName: string) {
    const existingChannel = this.listeners.get(channelName);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
      this.listeners.delete(channelName);
      console.log('🔌 Removed inventory listener:', channelName);
    }
  }
  
  /**
   * Removes all listeners (cleanup)
   */
  static cleanup() {
    this.listeners.forEach((channel, channelName) => {
      this.removeListener(channelName);
    });
  }
}