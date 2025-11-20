/**
 * OFFLINE DATABASE SCHEMA (IndexedDB via Dexie)
 * 
 * This schema defines all offline data structures for POS and inventory operations.
 * Uses IndexedDB for robust offline storage with better performance than localStorage.
 */

import Dexie, { Table } from 'dexie';

// ============= REFERENCE DATA (cached from server) =============

export interface CachedProduct {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  price: number;
  category_id: string;
  is_available: boolean;
  recipe_id?: string;
  inventory_stock_id?: string;
  selling_quantity?: number;
  image_url?: string;
  sku: string;
  // Cached metadata
  cached_at: number;
  cache_version: number;
}

export interface CachedCategory {
  id: string;
  store_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  display_order?: number;
  cached_at: number;
}

export interface CachedInventoryStock {
  id: string;
  store_id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  minimum_threshold?: number;
  maximum_capacity?: number;
  cost?: number;
  item_category?: string;
  // Starting snapshot for the day
  starting_quantity?: number;
  day_date?: string;
  cached_at: number;
}

export interface CachedRecipe {
  id: string;
  product_catalog_id: string;
  recipe_template_id?: string;
  total_cost: number;
  cost_per_serving: number;
  ingredients: Array<{
    inventory_stock_id: string;
    quantity_required: number;
    unit: string;
  }>;
  cached_at: number;
}

export interface CachedStoreConfig {
  store_id: string;
  name: string;
  config: any;
  cached_at: number;
}

// ============= TRANSACTIONAL DATA (local writes) =============

export interface OfflineOrder {
  id: string; // UUID
  device_id: string;
  store_id: string;
  user_id: string;
  shift_id?: string;
  customer_id?: string;
  order_type: 'dine-in' | 'takeout' | 'delivery';
  delivery_platform?: string;
  delivery_order_number?: string;
  subtotal: number;
  tax: number;
  discount: number;
  discount_type?: string;
  discount_id_number?: string;
  total: number;
  status: 'pending' | 'completed';
  created_at: number;
  completed_at?: number;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt?: number;
  sync_error?: string;
}

export interface OfflineOrderItem {
  id: string; // UUID
  order_id: string;
  product_id: string;
  variation_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: number;
}

export interface OfflinePayment {
  id: string; // UUID
  order_id: string;
  payment_method: 'cash' | 'card' | 'gcash' | 'paymaya' | 'bank_transfer';
  amount: number;
  amount_tendered?: number;
  change_amount?: number;
  reference_number?: string;
  payment_details?: any;
  created_at: number;
  synced: boolean;
}

export interface OfflineInventoryEvent {
  id: string; // UUID
  device_id: string;
  store_id: string;
  inventory_stock_id: string;
  event_type: 'sale' | 'adjustment' | 'waste' | 'restock';
  quantity_change: number; // negative for deductions, positive for additions
  order_id?: string; // link to sale transaction
  reason?: string;
  recorded_by: string;
  created_at: number;
  synced: boolean;
  sync_attempts: number;
}

// ============= OUTBOX (generic event queue) =============

export interface OutboxEvent {
  id: string; // UUID
  device_id: string;
  store_id: string;
  event_type: string; // 'order', 'payment', 'inventory_event', etc.
  payload: any;
  created_at: number;
  scheduled_sync_at?: number;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt?: number;
  sync_error?: string;
  priority: number; // higher = more urgent
}

// ============= BUSINESS DAY TRACKING =============

export interface BusinessDay {
  id: string;
  store_id: string;
  device_id: string;
  date: string; // YYYY-MM-DD
  opened_at: number;
  closed_at?: number;
  shift_id?: string;
  starting_cash?: number;
  // Snapshot of inventory at start of day
  inventory_snapshot?: Array<{
    inventory_stock_id: string;
    starting_quantity: number;
  }>;
  // Aggregates for the day (this device only)
  total_orders: number;
  total_sales: number;
  pending_sync: boolean;
}

// ============= SYNC METADATA =============

export interface SyncMetadata {
  key: string; // e.g., 'last_reference_sync', 'last_order_sync'
  store_id: string;
  timestamp: number;
  data?: any;
}

// ============= DEVICE CONFIG =============

export interface DeviceConfig {
  device_id: string;
  device_name?: string;
  store_id?: string;
  last_online_at?: number;
  created_at: number;
  updated_at: number;
}

// ============= DEXIE DATABASE CLASS =============

export class OfflineDatabase extends Dexie {
  // Reference data tables
  products!: Table<CachedProduct, string>;
  categories!: Table<CachedCategory, string>;
  inventory_stocks!: Table<CachedInventoryStock, string>;
  recipes!: Table<CachedRecipe, string>;
  store_configs!: Table<CachedStoreConfig, string>;

  // Transactional data tables
  orders!: Table<OfflineOrder, string>;
  order_items!: Table<OfflineOrderItem, string>;
  payments!: Table<OfflinePayment, string>;
  inventory_events!: Table<OfflineInventoryEvent, string>;

  // Outbox and sync tables
  outbox!: Table<OutboxEvent, string>;
  business_days!: Table<BusinessDay, string>;
  sync_metadata!: Table<SyncMetadata, string>;
  device_config!: Table<DeviceConfig, string>;

  constructor() {
    super('OfflinePOSDB');
    
    this.version(1).stores({
      // Reference data - indexed by id and store_id
      products: 'id, store_id, category_id, is_available',
      categories: 'id, store_id, is_active',
      inventory_stocks: 'id, store_id, day_date',
      recipes: 'id, product_catalog_id',
      store_configs: 'store_id',

      // Transactional data - indexed by id, store_id, and sync status
      orders: 'id, store_id, device_id, synced, created_at',
      order_items: 'id, order_id, product_id',
      payments: 'id, order_id, synced',
      inventory_events: 'id, store_id, device_id, inventory_stock_id, synced, order_id',

      // Outbox and sync
      outbox: 'id, device_id, store_id, synced, priority, event_type, created_at',
      business_days: 'id, store_id, date, device_id',
      sync_metadata: 'key, store_id',
      device_config: 'device_id'
    });
  }

  /**
   * Initialize database with error recovery
   */
  async initializeDatabase(): Promise<void> {
    try {
      await this.open();
      console.log('✅ IndexedDB initialized successfully');
    } catch (error: any) {
      console.error('❌ IndexedDB initialization failed:', error);
      
      // If database is corrupted, delete and recreate
      if (error.name === 'NotFoundError' || error.name === 'VersionError') {
        console.warn('🔄 Corrupted database detected, recreating...');
        await this.delete();
        await this.open();
        console.log('✅ IndexedDB recreated successfully');
      } else {
        throw error;
      }
    }
  }

  /**
   * Clear all cached reference data for a store (useful for resync)
   */
  async clearReferenceData(storeId: string): Promise<void> {
    await Promise.all([
      this.products.where('store_id').equals(storeId).delete(),
      this.categories.where('store_id').equals(storeId).delete(),
      this.inventory_stocks.where('store_id').equals(storeId).delete(),
      this.recipes.toCollection().delete(), // recipes don't have store_id directly
      this.store_configs.where('store_id').equals(storeId).delete()
    ]);
  }

  /**
   * Clear all local transactions (dangerous - only for testing/reset)
   */
  async clearAllTransactions(storeId: string): Promise<void> {
    await Promise.all([
      this.orders.where('store_id').equals(storeId).delete(),
      this.order_items.toCollection().delete(), // cascading delete would be better
      this.payments.toCollection().delete(),
      this.inventory_events.where('store_id').equals(storeId).delete(),
      this.outbox.where('store_id').equals(storeId).delete()
    ]);
  }

  /**
   * Get database size estimate
   */
  async getDatabaseSize(): Promise<{ tables: Record<string, number>; total: number }> {
    const tables: Record<string, number> = {};
    let total = 0;

    const tableNames = [
      'products', 'categories', 'inventory_stocks', 'recipes', 'store_configs',
      'orders', 'order_items', 'payments', 'inventory_events',
      'outbox', 'business_days', 'sync_metadata', 'device_config'
    ];

    for (const tableName of tableNames) {
      const count = await (this as any)[tableName].count();
      tables[tableName] = count;
      total += count;
    }

    return { tables, total };
  }
}

// Export singleton instance
export const offlineDB = new OfflineDatabase();

// Initialize database on module load
offlineDB.initializeDatabase().catch(err => {
  console.error('Fatal: Failed to initialize IndexedDB:', err);
});
