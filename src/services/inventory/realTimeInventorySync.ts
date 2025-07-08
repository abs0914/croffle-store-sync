import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryUpdateEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  old: any;
  new: any;
  eventTs: string;
}

export interface InventorySyncOptions {
  storeId: string;
  onStockUpdate?: (data: any) => void;
  onLowStockAlert?: (items: any[]) => void;
  onOutOfStockAlert?: (items: any[]) => void;
  enableToastNotifications?: boolean;
}

export class RealTimeInventorySync {
  private channels: any[] = [];
  private options: InventorySyncOptions;

  constructor(options: InventorySyncOptions) {
    this.options = options;
  }

  public startSync() {
    this.setupInventoryStockSync();
    this.setupTransactionSync();
    this.setupMovementSync();
  }

  public stopSync() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels = [];
  }

  private setupInventoryStockSync() {
    const channel = supabase
      .channel('inventory-stock-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_stock',
          filter: `store_id=eq.${this.options.storeId}`
        },
        (payload) => {
          this.handleInventoryStockChange(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private setupTransactionSync() {
    const channel = supabase
      .channel('transaction-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `store_id=eq.${this.options.storeId}`
        },
        (payload) => {
          this.handleTransactionChange(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private setupMovementSync() {
    const channel = supabase
      .channel('movement-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_movements'
        },
        (payload) => {
          this.handleMovementChange(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private async handleInventoryStockChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (this.options.onStockUpdate) {
      this.options.onStockUpdate({
        eventType,
        item: newRecord || oldRecord,
        previous: oldRecord
      });
    }

    // Check for low stock alerts
    if (eventType === 'UPDATE' && newRecord) {
      await this.checkStockLevels(newRecord);
    }

    // Toast notifications
    if (this.options.enableToastNotifications) {
      this.showStockChangeNotification(eventType, newRecord, oldRecord);
    }
  }

  private async handleTransactionChange(payload: any) {
    const { new: transaction } = payload;
    
    if (transaction && this.options.enableToastNotifications) {
      toast.success(`New sale completed: ₱${transaction.total}`, {
        description: `Receipt #${transaction.receipt_number}`
      });
    }

    // Trigger inventory refresh after sale
    if (this.options.onStockUpdate) {
      this.options.onStockUpdate({
        eventType: 'SALE_COMPLETED',
        transaction
      });
    }
  }

  private handleMovementChange(payload: any) {
    const { new: movement } = payload;
    
    if (movement && this.options.enableToastNotifications) {
      const isIncrease = movement.quantity_change > 0;
      const action = isIncrease ? 'Added' : 'Removed';
      
      toast.info(`Stock ${action.toLowerCase()}`, {
        description: `${Math.abs(movement.quantity_change)} units ${action.toLowerCase()}`
      });
    }
  }

  private async checkStockLevels(item: any) {
    const threshold = item.minimum_threshold || 10;
    
    // Out of stock alert
    if (item.stock_quantity <= 0) {
      if (this.options.onOutOfStockAlert) {
        this.options.onOutOfStockAlert([item]);
      }
      
      if (this.options.enableToastNotifications) {
        toast.error(`${item.item} is out of stock!`, {
          description: 'Consider restocking immediately',
          duration: 5000
        });
      }
    }
    // Low stock alert
    else if (item.stock_quantity <= threshold) {
      if (this.options.onLowStockAlert) {
        this.options.onLowStockAlert([item]);
      }
      
      if (this.options.enableToastNotifications) {
        toast.warning(`${item.item} is running low`, {
          description: `Only ${item.stock_quantity} ${item.unit} remaining`,
          duration: 4000
        });
      }
    }
  }

  private showStockChangeNotification(eventType: string, newRecord: any, oldRecord: any) {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          toast.success(`New item added: ${newRecord.item}`, {
            description: `${newRecord.stock_quantity} ${newRecord.unit} in stock`
          });
        }
        break;
      
      case 'UPDATE':
        if (newRecord && oldRecord) {
          const quantityChange = newRecord.stock_quantity - oldRecord.stock_quantity;
          if (quantityChange !== 0) {
            const isIncrease = quantityChange > 0;
            toast.info(`${newRecord.item} stock ${isIncrease ? 'increased' : 'decreased'}`, {
              description: `${isIncrease ? '+' : ''}${quantityChange} ${newRecord.unit} (${newRecord.stock_quantity} total)`
            });
          }
        }
        break;
      
      case 'DELETE':
        if (oldRecord) {
          toast.info(`Item removed: ${oldRecord.item}`);
        }
        break;
    }
  }

  // Public method to manually trigger stock level checks
  public async performStockAudit() {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', this.options.storeId)
        .eq('is_active', true);

      if (error) throw error;

      const lowStockItems = inventory?.filter(item => 
        item.stock_quantity <= (item.minimum_threshold || 10) && item.stock_quantity > 0
      ) || [];

      const outOfStockItems = inventory?.filter(item => 
        item.stock_quantity <= 0
      ) || [];

      if (lowStockItems.length > 0 && this.options.onLowStockAlert) {
        this.options.onLowStockAlert(lowStockItems);
      }

      if (outOfStockItems.length > 0 && this.options.onOutOfStockAlert) {
        this.options.onOutOfStockAlert(outOfStockItems);
      }

      if (this.options.enableToastNotifications) {
        const totalIssues = lowStockItems.length + outOfStockItems.length;
        if (totalIssues > 0) {
          toast.warning(`Stock audit complete: ${totalIssues} items need attention`);
        } else {
          toast.success('Stock audit complete: All items properly stocked');
        }
      }

      return {
        lowStockItems,
        outOfStockItems,
        totalItems: inventory?.length || 0
      };
    } catch (error) {
      console.error('Error performing stock audit:', error);
      if (this.options.enableToastNotifications) {
        toast.error('Failed to perform stock audit');
      }
      throw error;
    }
  }
}