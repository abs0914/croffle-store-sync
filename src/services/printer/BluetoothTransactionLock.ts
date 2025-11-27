/**
 * BLUETOOTH TRANSACTION LOCK
 * 
 * Provides global transaction-level locking for Bluetooth write operations
 * to prevent concurrent writes to the same characteristic that cause buffer
 * overflow, data corruption, and partial prints.
 */

export class BluetoothTransactionLock {
  private static activeLock: Promise<void> = Promise.resolve();
  private static lockHolderId: string | null = null;

  /**
   * Acquire a lock for a print operation
   * Returns a release function that MUST be called when done
   */
  static async acquire(operationId: string): Promise<() => void> {
    console.log(`🔒 [TX-LOCK] Requesting lock for: ${operationId}`);
    
    // Wait for any existing lock to be released
    await this.activeLock;
    
    console.log(`✅ [TX-LOCK] Lock acquired: ${operationId}`);
    this.lockHolderId = operationId;
    
    // Create a new promise that will be resolved when the operation completes
    let releaseLock: () => void;
    this.activeLock = new Promise<void>((resolve) => {
      releaseLock = () => {
        console.log(`🔓 [TX-LOCK] Lock released: ${operationId}`);
        this.lockHolderId = null;
        resolve();
      };
    });
    
    return releaseLock!;
  }

  /**
   * Check if a lock is currently held
   */
  static isLocked(): boolean {
    return this.lockHolderId !== null;
  }

  /**
   * Get the current lock holder ID
   */
  static getLockHolder(): string | null {
    return this.lockHolderId;
  }

  /**
   * Force release the lock (emergency use only)
   */
  static forceRelease(): void {
    console.warn('⚠️ [TX-LOCK] Force releasing lock');
    this.lockHolderId = null;
    this.activeLock = Promise.resolve();
  }
}
