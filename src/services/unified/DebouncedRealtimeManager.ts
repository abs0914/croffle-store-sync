/**
 * Debounced Real-Time Update Manager
 * Groups multiple real-time updates within a time window to prevent cascading refreshes
 */

interface PendingUpdate {
  storeId: string;
  table: string;
  timestamp: number;
}

export class DebouncedRealtimeManager {
  private static instance: DebouncedRealtimeManager;
  private pendingUpdates = new Map<string, PendingUpdate[]>();
  private updateTimeouts = new Map<string, NodeJS.Timeout>();
  private debounceWindow = 2000; // 2 seconds
  private callbacks = new Map<string, (updates: PendingUpdate[]) => void>();

  static getInstance(): DebouncedRealtimeManager {
    if (!DebouncedRealtimeManager.instance) {
      DebouncedRealtimeManager.instance = new DebouncedRealtimeManager();
    }
    return DebouncedRealtimeManager.instance;
  }

  /**
   * Register a callback for a store's updates
   */
  registerCallback(storeId: string, callback: (updates: PendingUpdate[]) => void): void {
    this.callbacks.set(storeId, callback);
  }

  /**
   * Unregister a callback
   */
  unregisterCallback(storeId: string): void {
    this.callbacks.delete(storeId);
    this.clearPendingUpdates(storeId);
  }

  /**
   * Queue an update for debounced processing
   */
  queueUpdate(storeId: string, table: string): void {
    const update: PendingUpdate = {
      storeId,
      table,
      timestamp: Date.now()
    };

    // Add to pending updates
    const existing = this.pendingUpdates.get(storeId) || [];
    existing.push(update);
    this.pendingUpdates.set(storeId, existing);

    console.log(`⏱️ [DEBOUNCED RT] Queued ${table} update for store ${storeId.slice(0, 8)}`);

    // Clear existing timeout
    const existingTimeout = this.updateTimeouts.get(storeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.processUpdates(storeId);
    }, this.debounceWindow);

    this.updateTimeouts.set(storeId, timeout);
  }

  /**
   * Process accumulated updates
   */
  private processUpdates(storeId: string): void {
    const updates = this.pendingUpdates.get(storeId);
    if (!updates || updates.length === 0) return;

    // Get unique tables affected
    const affectedTables = [...new Set(updates.map(u => u.table))];
    
    console.log(`🚀 [DEBOUNCED RT] Processing ${updates.length} updates for store ${storeId.slice(0, 8)}:`, {
      tables: affectedTables,
      window: `${this.debounceWindow}ms`,
      updateCount: updates.length
    });

    // Call callback with all updates
    const callback = this.callbacks.get(storeId);
    if (callback) {
      callback(updates);
    }

    // Clear processed updates
    this.pendingUpdates.delete(storeId);
    this.updateTimeouts.delete(storeId);
  }

  /**
   * Clear all pending updates for a store
   */
  private clearPendingUpdates(storeId: string): void {
    const timeout = this.updateTimeouts.get(storeId);
    if (timeout) {
      clearTimeout(timeout);
    }
    this.pendingUpdates.delete(storeId);
    this.updateTimeouts.delete(storeId);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      pendingStores: this.pendingUpdates.size,
      totalPendingUpdates: Array.from(this.pendingUpdates.values())
        .reduce((sum, updates) => sum + updates.length, 0),
      debounceWindow: this.debounceWindow
    };
  }
}

export const debouncedRealtimeManager = DebouncedRealtimeManager.getInstance();
