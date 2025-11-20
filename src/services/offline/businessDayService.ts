/**
 * BUSINESS DAY SERVICE
 * 
 * Manages Start-of-Day (SOD) and End-of-Day (EOD) operations.
 * Tracks daily business operations per device.
 */

import { offlineDB, BusinessDay } from './db/schema';
import { deviceIdService } from './deviceIdService';
import { referenceDataService } from './referenceDataService';
import { outboxService } from './outboxService';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

class BusinessDayService {
  /**
   * Start of Day: Initialize business day and cache data
   */
  async startOfDay(
    storeId: string,
    shiftId?: string,
    startingCash?: number
  ): Promise<{ success: boolean; businessDayId: string; cached: any }> {
    console.log('🌅 Starting business day for store:', storeId);

    try {
      const deviceId = await deviceIdService.getDeviceId();
      const today = new Date().toISOString().split('T')[0];

      // Check if business day already exists for today
      const existing = await offlineDB.business_days
        .where('[store_id+device_id+date]')
        .equals([storeId, deviceId, today])
        .first();

      if (existing && !existing.closed_at) {
        console.log('ℹ️ Business day already started:', existing.id);
        toast.info('Business day already in progress');
        return {
          success: true,
          businessDayId: existing.id,
          cached: null
        };
      }

      // Fetch and cache reference data
      const cached = await referenceDataService.startOfDay(storeId);

      // Get current inventory snapshot
      const inventory = await referenceDataService.getInventory(storeId);
      const inventorySnapshot = inventory.map(i => ({
        inventory_stock_id: i.id,
        starting_quantity: i.stock_quantity
      }));

      // Create business day record
      const businessDayId = uuidv4();
      const businessDay: BusinessDay = {
        id: businessDayId,
        store_id: storeId,
        device_id: deviceId,
        date: today,
        opened_at: Date.now(),
        shift_id: shiftId,
        starting_cash: startingCash,
        inventory_snapshot: inventorySnapshot,
        total_orders: 0,
        total_sales: 0,
        pending_sync: false
      };

      await offlineDB.business_days.add(businessDay);

      // Add SOD event to outbox
      await outboxService.addEvent(storeId, 'sod_opened', {
        business_day_id: businessDayId,
        device_id: deviceId,
        shift_id: shiftId,
        starting_cash: startingCash,
        inventory_snapshot: inventorySnapshot,
        timestamp: Date.now()
      }, 8); // High priority

      console.log('✅ Business day started:', businessDayId);
      toast.success('Business day started', {
        description: `${cached.cached.products} products and ${cached.cached.inventory} inventory items cached`
      });

      return {
        success: true,
        businessDayId,
        cached
      };
    } catch (error) {
      console.error('❌ Failed to start business day:', error);
      toast.error('Failed to start business day');
      return {
        success: false,
        businessDayId: '',
        cached: null
      };
    }
  }

  /**
   * End of Day: Close business day and prepare for sync
   */
  async endOfDay(storeId: string): Promise<{
    success: boolean;
    summary: any;
    pendingSync: boolean;
  }> {
    console.log('🌙 Ending business day for store:', storeId);

    try {
      const deviceId = await deviceIdService.getDeviceId();
      const today = new Date().toISOString().split('T')[0];

      // Get today's business day
      const businessDay = await offlineDB.business_days
        .where('[store_id+device_id+date]')
        .equals([storeId, deviceId, today])
        .first();

      if (!businessDay) {
        toast.error('No active business day found');
        return {
          success: false,
          summary: null,
          pendingSync: false
        };
      }

      if (businessDay.closed_at) {
        toast.info('Business day already closed');
        return {
          success: true,
          summary: await this.getBusinessDaySummary(businessDay.id),
          pendingSync: businessDay.pending_sync
        };
      }

      // Get summary of today's operations
      const summary = await this.getBusinessDaySummary(businessDay.id);

      // Check if there are pending events
      const pendingEvents = await outboxService.getPendingEventsByStore(storeId);
      const hasPendingSync = pendingEvents.length > 0;

      // Update business day as closed
      await offlineDB.business_days.update(businessDay.id, {
        closed_at: Date.now(),
        total_orders: summary.totalOrders,
        total_sales: summary.totalSales,
        pending_sync: hasPendingSync
      });

      // Add EOD event to outbox
      await outboxService.addEvent(storeId, 'eod_closed', {
        business_day_id: businessDay.id,
        device_id: deviceId,
        summary,
        pending_sync: hasPendingSync,
        timestamp: Date.now()
      }, 9); // Very high priority

      console.log('✅ Business day closed:', businessDay.id);
      
      if (hasPendingSync) {
        toast.warning('Business day closed with pending sync', {
          description: `${pendingEvents.length} transactions pending sync`
        });
      } else {
        toast.success('Business day closed successfully');
      }

      return {
        success: true,
        summary,
        pendingSync: hasPendingSync
      };
    } catch (error) {
      console.error('❌ Failed to end business day:', error);
      toast.error('Failed to close business day');
      return {
        success: false,
        summary: null,
        pendingSync: false
      };
    }
  }

  /**
   * Get business day summary
   */
  async getBusinessDaySummary(businessDayId: string): Promise<{
    businessDayId: string;
    date: string;
    totalOrders: number;
    totalSales: number;
    inventoryChanges: Array<{
      item: string;
      starting: number;
      ending: number;
      sold: number;
    }>;
  }> {
    const businessDay = await offlineDB.business_days.get(businessDayId);
    if (!businessDay) {
      throw new Error('Business day not found');
    }

    // Get all orders for this business day
    const orders = await offlineDB.orders
      .where('[store_id+synced]')
      .between([businessDay.store_id, 0], [businessDay.store_id, 1])
      .and(o => {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        return orderDate === businessDay.date;
      })
      .toArray();

    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);

    // Get inventory changes
    const inventoryEvents = await offlineDB.inventory_events
      .where('[store_id+synced]')
      .between([businessDay.store_id, 0], [businessDay.store_id, 1])
      .and(e => {
        const eventDate = new Date(e.created_at).toISOString().split('T')[0];
        return eventDate === businessDay.date;
      })
      .toArray();

    // Aggregate inventory changes
    const inventoryChanges = await this.aggregateInventoryChanges(
      businessDay,
      inventoryEvents
    );

    return {
      businessDayId: businessDay.id,
      date: businessDay.date,
      totalOrders,
      totalSales,
      inventoryChanges
    };
  }

  /**
   * Aggregate inventory changes
   */
  private async aggregateInventoryChanges(
    businessDay: BusinessDay,
    events: Array<any>
  ): Promise<Array<any>> {
    const snapshot = businessDay.inventory_snapshot || [];
    const changes: Map<string, any> = new Map();

    // Initialize with starting quantities
    for (const item of snapshot) {
      changes.set(item.inventory_stock_id, {
        inventory_stock_id: item.inventory_stock_id,
        starting: item.starting_quantity,
        sold: 0,
        adjusted: 0
      });
    }

    // Apply events
    for (const event of events) {
      const existing = changes.get(event.inventory_stock_id) || {
        inventory_stock_id: event.inventory_stock_id,
        starting: 0,
        sold: 0,
        adjusted: 0
      };

      if (event.event_type === 'sale') {
        existing.sold += Math.abs(event.quantity_change);
      } else if (event.event_type === 'adjustment' || event.event_type === 'waste') {
        existing.adjusted += event.quantity_change;
      }

      changes.set(event.inventory_stock_id, existing);
    }

    // Get item names
    const result = [];
    for (const [stockId, data] of changes.entries()) {
      const stock = await offlineDB.inventory_stocks.get(stockId);
      result.push({
        item: stock?.item || 'Unknown',
        starting: data.starting,
        ending: data.starting - data.sold + data.adjusted,
        sold: data.sold,
        adjusted: data.adjusted
      });
    }

    return result;
  }

  /**
   * Get current business day
   */
  async getCurrentBusinessDay(storeId: string): Promise<BusinessDay | undefined> {
    const deviceId = await deviceIdService.getDeviceId();
    const today = new Date().toISOString().split('T')[0];

    return await offlineDB.business_days
      .where('[store_id+device_id+date]')
      .equals([storeId, deviceId, today])
      .first();
  }

  /**
   * Check if business day is open
   */
  async isBusinessDayOpen(storeId: string): Promise<boolean> {
    const businessDay = await this.getCurrentBusinessDay(storeId);
    return businessDay !== undefined && !businessDay.closed_at;
  }

  /**
   * Get business days with pending sync
   */
  async getBusinessDaysWithPendingSync(storeId: string): Promise<BusinessDay[]> {
    return await offlineDB.business_days
      .where('store_id')
      .equals(storeId)
      .and(bd => bd.pending_sync === true)
      .toArray();
  }
}

// Export singleton instance
export const businessDayService = new BusinessDayService();
