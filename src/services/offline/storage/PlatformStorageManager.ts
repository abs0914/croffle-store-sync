/**
 * PLATFORM STORAGE MANAGER
 * 
 * Provides unified storage interface across web and mobile platforms:
 * - IndexedDB for web (50MB+ capacity, async operations)
 * - SQLite/Room for Android (unlimited capacity, native performance)
 * - localStorage fallback for compatibility
 */

import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export interface StorageConfig {
  dbName: string;
  version: number;
  stores: StorageStoreConfig[];
}

export interface StorageStoreConfig {
  name: string;
  keyPath: string;
  indexes?: StorageIndexConfig[];
}

export interface StorageIndexConfig {
  name: string;
  keyPath: string;
  unique?: boolean;
}

export interface StorageItem {
  id: string;
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface StorageQuery {
  store: string;
  index?: string;
  key?: any;
  range?: IDBKeyRange;
  limit?: number;
  offset?: number;
}

export interface StorageStats {
  totalItems: number;
  totalSize: number; // in bytes
  oldestItem: number; // timestamp
  newestItem: number; // timestamp
  storageType: 'indexeddb' | 'sqlite' | 'localstorage';
  availableSpace?: number;
}

export class PlatformStorageManager {
  private static instance: PlatformStorageManager;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private storageType: 'indexeddb' | 'sqlite' | 'localstorage' = 'localstorage';
  private config: StorageConfig;

  private constructor(config: StorageConfig) {
    this.config = config;
  }

  static getInstance(config?: StorageConfig): PlatformStorageManager {
    if (!PlatformStorageManager.instance) {
      if (!config) {
        throw new Error('StorageConfig required for first initialization');
      }
      PlatformStorageManager.instance = new PlatformStorageManager(config);
    }
    return PlatformStorageManager.instance;
  }

  /**
   * Initialize storage based on platform capabilities
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🗄️ Initializing Platform Storage Manager...');

    try {
      if (Capacitor.isNativePlatform()) {
        // Try native SQLite first for mobile
        await this.initializeNativeStorage();
      } else if (this.supportsIndexedDB()) {
        // Use IndexedDB for web browsers
        await this.initializeIndexedDB();
      } else {
        // Fallback to localStorage
        this.initializeLocalStorage();
      }

      this.isInitialized = true;
      console.log(`✅ Storage initialized using: ${this.storageType}`);
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      // Fallback to localStorage
      this.initializeLocalStorage();
      this.isInitialized = true;
    }
  }

  /**
   * Store data with automatic platform optimization
   */
  async setItem(store: string, key: string, data: any, metadata?: Record<string, any>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const item: StorageItem = {
      id: key,
      data,
      timestamp: Date.now(),
      metadata
    };

    try {
      switch (this.storageType) {
        case 'indexeddb':
          await this.setItemIndexedDB(store, item);
          break;
        case 'sqlite':
          await this.setItemSQLite(store, item);
          break;
        case 'localstorage':
          this.setItemLocalStorage(store, item);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to store item in ${store}:`, error);
      // Try fallback to localStorage
      if (this.storageType !== 'localstorage') {
        this.setItemLocalStorage(store, item);
      }
      throw error;
    }
  }

  /**
   * Retrieve data with platform optimization
   */
  async getItem(store: string, key: string): Promise<StorageItem | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      switch (this.storageType) {
        case 'indexeddb':
          return await this.getItemIndexedDB(store, key);
        case 'sqlite':
          return await this.getItemSQLite(store, key);
        case 'localstorage':
          return this.getItemLocalStorage(store, key);
      }
    } catch (error) {
      console.error(`❌ Failed to retrieve item from ${store}:`, error);
      // Try fallback to localStorage
      if (this.storageType !== 'localstorage') {
        return this.getItemLocalStorage(store, key);
      }
      return null;
    }
  }

  /**
   * Query multiple items with advanced filtering
   */
  async query(query: StorageQuery): Promise<StorageItem[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      switch (this.storageType) {
        case 'indexeddb':
          return await this.queryIndexedDB(query);
        case 'sqlite':
          return await this.querySQLite(query);
        case 'localstorage':
          return this.queryLocalStorage(query);
      }
    } catch (error) {
      console.error('❌ Query failed:', error);
      return [];
    }
  }

  /**
   * Remove item from storage
   */
  async removeItem(store: string, key: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      switch (this.storageType) {
        case 'indexeddb':
          await this.removeItemIndexedDB(store, key);
          break;
        case 'sqlite':
          await this.removeItemSQLite(store, key);
          break;
        case 'localstorage':
          this.removeItemLocalStorage(store, key);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to remove item from ${store}:`, error);
      throw error;
    }
  }

  /**
   * Clear entire store
   */
  async clearStore(store: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      switch (this.storageType) {
        case 'indexeddb':
          await this.clearStoreIndexedDB(store);
          break;
        case 'sqlite':
          await this.clearStoreSQLite(store);
          break;
        case 'localstorage':
          this.clearStoreLocalStorage(store);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to clear store ${store}:`, error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      switch (this.storageType) {
        case 'indexeddb':
          return await this.getStatsIndexedDB();
        case 'sqlite':
          return await this.getStatsSQLite();
        case 'localstorage':
          return this.getStatsLocalStorage();
      }
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {
        totalItems: 0,
        totalSize: 0,
        oldestItem: Date.now(),
        newestItem: Date.now(),
        storageType: this.storageType
      };
    }
  }

  /**
   * Check if IndexedDB is supported
   */
  private supportsIndexedDB(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && indexedDB !== null;
  }

  /**
   * Initialize IndexedDB for web browsers
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.storageType = 'indexeddb';
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        for (const storeConfig of this.config.stores) {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, { 
              keyPath: storeConfig.keyPath 
            });

            // Create indexes
            if (storeConfig.indexes) {
              for (const indexConfig of storeConfig.indexes) {
                store.createIndex(
                  indexConfig.name,
                  indexConfig.keyPath,
                  { unique: indexConfig.unique || false }
                );
              }
            }
          }
        }
      };
    });
  }

  /**
   * Initialize native SQLite storage for mobile
   */
  private async initializeNativeStorage(): Promise<void> {
    // This will be implemented when we create the Capacitor plugin
    // For now, fall back to IndexedDB if available, otherwise localStorage
    if (this.supportsIndexedDB()) {
      await this.initializeIndexedDB();
    } else {
      this.initializeLocalStorage();
    }
  }

  /**
   * Initialize localStorage fallback
   */
  private initializeLocalStorage(): void {
    this.storageType = 'localstorage';
    console.log('📦 Using localStorage fallback');
  }

  // IndexedDB implementation methods
  private async setItemIndexedDB(store: string, item: StorageItem): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getItemIndexedDB(store: string, key: string): Promise<StorageItem | null> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async queryIndexedDB(query: StorageQuery): Promise<StorageItem[]> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([query.store], 'readonly');
      const objectStore = transaction.objectStore(query.store);

      let source: IDBObjectStore | IDBIndex = objectStore;
      if (query.index) {
        source = objectStore.index(query.index);
      }

      const request = query.range
        ? source.openCursor(query.range)
        : source.openCursor();

      const results: StorageItem[] = [];
      let count = 0;
      const offset = query.offset || 0;
      const limit = query.limit;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (count >= offset) {
            results.push(cursor.value);
            if (limit && results.length >= limit) {
              resolve(results);
              return;
            }
          }
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async removeItemIndexedDB(store: string, key: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearStoreIndexedDB(store: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getStatsIndexedDB(): Promise<StorageStats> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    let totalItems = 0;
    let totalSize = 0;
    let oldestItem = Date.now();
    let newestItem = 0;

    // Get stats from all stores
    for (const storeConfig of this.config.stores) {
      const storeStats = await this.getStoreStatsIndexedDB(storeConfig.name);
      totalItems += storeStats.items;
      totalSize += storeStats.size;
      oldestItem = Math.min(oldestItem, storeStats.oldest);
      newestItem = Math.max(newestItem, storeStats.newest);
    }

    // Estimate available space (IndexedDB quota)
    let availableSpace: number | undefined;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        availableSpace = (estimate.quota || 0) - (estimate.usage || 0);
      } catch (error) {
        console.warn('Could not estimate storage quota:', error);
      }
    }

    return {
      totalItems,
      totalSize,
      oldestItem,
      newestItem,
      storageType: 'indexeddb',
      availableSpace
    };
  }

  private async getStoreStatsIndexedDB(storeName: string): Promise<{items: number, size: number, oldest: number, newest: number}> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.openCursor();

      let items = 0;
      let size = 0;
      let oldest = Date.now();
      let newest = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          items++;
          const itemSize = JSON.stringify(cursor.value).length;
          size += itemSize;

          const item = cursor.value as StorageItem;
          if (item.timestamp) {
            oldest = Math.min(oldest, item.timestamp);
            newest = Math.max(newest, item.timestamp);
          }

          cursor.continue();
        } else {
          resolve({ items, size, oldest, newest });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // SQLite implementation methods (for future Android native implementation)
  private async setItemSQLite(store: string, item: StorageItem): Promise<void> {
    throw new Error('SQLite storage not yet implemented');
  }

  private async getItemSQLite(store: string, key: string): Promise<StorageItem | null> {
    throw new Error('SQLite storage not yet implemented');
  }

  private async querySQLite(query: StorageQuery): Promise<StorageItem[]> {
    throw new Error('SQLite storage not yet implemented');
  }

  private async removeItemSQLite(store: string, key: string): Promise<void> {
    throw new Error('SQLite storage not yet implemented');
  }

  private async clearStoreSQLite(store: string): Promise<void> {
    throw new Error('SQLite storage not yet implemented');
  }

  private async getStatsSQLite(): Promise<StorageStats> {
    throw new Error('SQLite storage not yet implemented');
  }

  // localStorage implementation methods
  private setItemLocalStorage(store: string, item: StorageItem): void {
    const key = `${store}_${item.id}`;
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('localStorage setItem failed:', error);
      throw error;
    }
  }

  private getItemLocalStorage(store: string, key: string): StorageItem | null {
    const storageKey = `${store}_${key}`;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('localStorage getItem failed:', error);
      return null;
    }
  }

  private queryLocalStorage(query: StorageQuery): StorageItem[] {
    const items: StorageItem[] = [];
    const prefix = `${query.store}_`;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            items.push(JSON.parse(item));
          }
        }
      }
      
      // Apply limit and offset
      const start = query.offset || 0;
      const end = query.limit ? start + query.limit : undefined;
      return items.slice(start, end);
    } catch (error) {
      console.error('localStorage query failed:', error);
      return [];
    }
  }

  private removeItemLocalStorage(store: string, key: string): void {
    const storageKey = `${store}_${key}`;
    localStorage.removeItem(storageKey);
  }

  private clearStoreLocalStorage(store: string): void {
    const prefix = `${store}_`;
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  private getStatsLocalStorage(): StorageStats {
    let totalItems = 0;
    let totalSize = 0;
    let oldestItem = Date.now();
    let newestItem = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const item = localStorage.getItem(key);
        if (item) {
          totalItems++;
          totalSize += item.length;
          
          try {
            const parsed: StorageItem = JSON.parse(item);
            if (parsed.timestamp) {
              oldestItem = Math.min(oldestItem, parsed.timestamp);
              newestItem = Math.max(newestItem, parsed.timestamp);
            }
          } catch (error) {
            // Skip invalid items
          }
        }
      }
    }

    return {
      totalItems,
      totalSize,
      oldestItem,
      newestItem,
      storageType: 'localstorage'
    };
  }
}
