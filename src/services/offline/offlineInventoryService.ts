/**
 * OFFLINE INVENTORY SERVICE
 * 
 * Handles inventory operations in offline mode.
 * Records sales deductions, manual adjustments, and waste.
 */

import { offlineDB, OfflineInventoryEvent, CachedInventoryStock } from './db/schema';
import { deviceIdService } from './deviceIdService';
import { outboxService } from './outboxService';
import { referenceDataService } from './referenceDataService';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

class OfflineInventoryService {
  /**
   * Record inventory deduction from sale
   */
  async recordSaleDeduction(
    storeId: string,
    productId: string,
    quantity: number,
    orderId: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get product to find recipe/inventory mapping
      const product = await offlineDB.products.get(productId);
      if (!product) {
        console.warn('Product not found for inventory deduction:', productId);
        return false;
      }

      // If product has recipe, deduct ingredients
      if (product.recipe_id) {
        const recipe = await referenceDataService.getRecipe(product.id);
        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            await this.recordInventoryEvent(
              storeId,
              ingredient.inventory_stock_id,
              'sale',
              -1 * ingredient.quantity_required * quantity,
              orderId,
              userId
            );
          }
        }
      }
      // If direct inventory product
      else if (product.inventory_stock_id) {
        const sellingQty = product.selling_quantity || 1;
        await this.recordInventoryEvent(
          storeId,
          product.inventory_stock_id,
          'sale',
          -1 * sellingQty * quantity,
          orderId,
          userId
        );
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to record sale deduction:', error);
      return false;
    }
  }

  /**
   * Record manual inventory adjustment
   */
  async recordManualAdjustment(
    storeId: string,
    inventoryStockId: string,
    quantityChange: number,
    reason: string,
    userId: string
  ): Promise<boolean> {
    try {
      await this.recordInventoryEvent(
        storeId,
        inventoryStockId,
        'adjustment',
        quantityChange,
        undefined,
        userId,
        reason
      );

      toast.success('Inventory adjustment recorded');
      return true;
    } catch (error) {
      console.error('❌ Failed to record adjustment:', error);
      toast.error('Failed to record adjustment');
      return false;
    }
  }

  /**
   * Record waste/damage
   */
  async recordWaste(
    storeId: string,
    inventoryStockId: string,
    quantity: number,
    reason: string,
    userId: string
  ): Promise<boolean> {
    try {
      await this.recordInventoryEvent(
        storeId,
        inventoryStockId,
        'waste',
        -1 * Math.abs(quantity),
        undefined,
        userId,
        reason
      );

      toast.success('Waste recorded');
      return true;
    } catch (error) {
      console.error('❌ Failed to record waste:', error);
      toast.error('Failed to record waste');
      return false;
    }
  }

  /**
   * Internal: Record inventory event
   */
  private async recordInventoryEvent(
    storeId: string,
    inventoryStockId: string,
    eventType: 'sale' | 'adjustment' | 'waste' | 'restock',
    quantityChange: number,
    orderId: string | undefined,
    userId: string,
    reason?: string
  ): Promise<void> {
    const deviceId = await deviceIdService.getDeviceId();
    const eventId = uuidv4();

    const event: OfflineInventoryEvent = {
      id: eventId,
      device_id: deviceId,
      store_id: storeId,
      inventory_stock_id: inventoryStockId,
      event_type: eventType,
      quantity_change: quantityChange,
      order_id: orderId,
      reason,
      recorded_by: userId,
      created_at: Date.now(),
      synced: false,
      sync_attempts: 0
    };

    await offlineDB.inventory_events.add(event);

    // Add to outbox
    await outboxService.addEvent(storeId, 'inventory_event', {
      event_id: eventId,
      event
    }, eventType === 'sale' ? 6 : 5);

    console.log(`📦 Inventory event recorded: ${eventType} (${quantityChange}) for ${inventoryStockId}`);
  }

  /**
   * Get current inventory levels (with offline deductions applied)
   */
  async getCurrentInventoryLevels(storeId: string): Promise<Array<{
    id: string;
    item: string;
    unit: string;
    starting_quantity: number;
    current_quantity: number;
    deducted_today: number;
    adjusted_today: number;
  }>> {
    const deviceId = await deviceIdService.getDeviceId();
    const today = new Date().toISOString().split('T')[0];

    // Get cached inventory (starting quantities)
    const cachedInventory = await referenceDataService.getInventory(storeId);

    // Get today's events for this device
    const startOfDay = new Date(today).getTime();
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000);

    const events = await offlineDB.inventory_events
      .where('[device_id+created_at]')
      .between([deviceId, startOfDay], [deviceId, endOfDay])
      .and(e => e.store_id === storeId)
      .toArray();

    // Aggregate by inventory stock
    const result: Map<string, any> = new Map();

    for (const stock of cachedInventory) {
      result.set(stock.id, {
        id: stock.id,
        item: stock.item,
        unit: stock.unit,
        starting_quantity: stock.starting_quantity || stock.stock_quantity,
        deducted_today: 0,
        adjusted_today: 0,
        current_quantity: stock.starting_quantity || stock.stock_quantity
      });
    }

    // Apply events
    for (const event of events) {
      const existing = result.get(event.inventory_stock_id);
      if (!existing) continue;

      if (event.event_type === 'sale') {
        existing.deducted_today += Math.abs(event.quantity_change);
      } else if (event.event_type === 'adjustment' || event.event_type === 'waste') {
        existing.adjusted_today += event.quantity_change;
      }

      existing.current_quantity = existing.starting_quantity - existing.deducted_today + existing.adjusted_today;
    }

    return Array.from(result.values());
  }

  /**
   * Get unsynced inventory events count
   */
  async getUnsyncedEventsCount(storeId: string): Promise<number> {
    return await offlineDB.inventory_events
      .where('[store_id+synced]')
      .equals([storeId, 0])
      .count();
  }

  /**
   * Get today's inventory activity
   */
  async getTodayActivity(storeId: string): Promise<{
    totalDeductions: number;
    totalAdjustments: number;
    totalWaste: number;
    itemsAffected: number;
  }> {
    const deviceId = await deviceIdService.getDeviceId();
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today).getTime();
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000);

    const events = await offlineDB.inventory_events
      .where('[device_id+created_at]')
      .between([deviceId, startOfDay], [deviceId, endOfDay])
      .and(e => e.store_id === storeId)
      .toArray();

    const uniqueItems = new Set(events.map(e => e.inventory_stock_id));

    return {
      totalDeductions: events.filter(e => e.event_type === 'sale').reduce((sum, e) => sum + Math.abs(e.quantity_change), 0),
      totalAdjustments: events.filter(e => e.event_type === 'adjustment').length,
      totalWaste: events.filter(e => e.event_type === 'waste').reduce((sum, e) => sum + Math.abs(e.quantity_change), 0),
      itemsAffected: uniqueItems.size
    };
  }
}

// Export singleton instance
export const offlineInventoryService = new OfflineInventoryService();
