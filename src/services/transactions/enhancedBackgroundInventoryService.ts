import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deductIngredientsWithNetworkResilience, AffectedInventoryItem } from "@/services/inventory/networkResilientInventoryTracker";

export interface InventoryProcessingResult {
  success: boolean;
  transactionId: string;
  itemsProcessed: number;
  totalItems: number;
  syncStatus: 'success' | 'partial' | 'failed';
  errors: string[];
  processingTime: number;
  affectedItems: AffectedInventoryItem[];
}

/**
 * Enhanced background inventory service with robust network error handling
 */
export class EnhancedBackgroundInventoryService {
  private static processingQueue = new Map<string, Promise<InventoryProcessingResult>>();
  private static readonly MAX_CONCURRENT_JOBS = 3;
  private static readonly PROCESSING_TIMEOUT = 30000; // 30 seconds

  /**
   * Process inventory in background with comprehensive error handling
   */
  static async processInventoryInBackground(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<InventoryProcessingResult> {
    // Check if already processing
    if (this.processingQueue.has(transactionId)) {
      console.log(`🔄 Transaction ${transactionId} already being processed`);
      return this.processingQueue.get(transactionId)!;
    }

    // Create processing promise
    const processingPromise = this.executeInventoryProcessing(transactionId, items, storeId);
    this.processingQueue.set(transactionId, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      // Clean up after processing
      setTimeout(() => {
        this.processingQueue.delete(transactionId);
      }, 60000); // Keep for 1 minute for potential retry queries
    }
  }

  /**
   * Execute inventory processing with enhanced error handling
   */
  private static async executeInventoryProcessing(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<InventoryProcessingResult> {
    const startTime = Date.now();
    const processedItems: string[] = [];
    const errors: string[] = [];
    const allAffectedItems: AffectedInventoryItem[] = [];

    console.log(`🚀 Starting enhanced inventory processing for transaction: ${transactionId}`);

    try {
      // Process items with controlled concurrency
      const batches = this.createBatches(items, 2); // Process 2 items at a time
      
      for (const batch of batches) {
        const batchPromises = batch.map(item => this.processItemSafely(item, transactionId));
        const batchResults = await Promise.allSettled(batchPromises);

        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          const item = batch[i];

          if (result.status === 'fulfilled' && result.value.success) {
            processedItems.push(item.productId);
            allAffectedItems.push(...result.value.affected_inventory_items);
            console.log(`✅ Successfully processed: ${item.product?.name || item.productId}`);
          } else {
            const error = result.status === 'rejected' 
              ? result.reason?.message || 'Unknown error'
              : (result.value as any)?.error_details || 'Processing failed';
            errors.push(`${item.product?.name || item.productId}: ${error}`);
            console.error(`❌ Failed to process: ${item.product?.name || item.productId}`, error);
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const syncStatus = this.determineSyncStatus(processedItems.length, items.length);

      // Log comprehensive result
      await this.logInventoryProcessingResult({
        transactionId,
        syncStatus,
        itemsProcessed: processedItems.length,
        totalItems: items.length,
        errors,
        processingTime,
        affectedItems: allAffectedItems
      });

      // Show appropriate user notification
      this.showUserNotification(syncStatus, processedItems.length, items.length, errors);

      return {
        success: syncStatus !== 'failed',
        transactionId,
        itemsProcessed: processedItems.length,
        totalItems: items.length,
        syncStatus,
        errors,
        processingTime,
        affectedItems: allAffectedItems
      };

    } catch (criticalError) {
      const processingTime = Date.now() - startTime;
      const errorMessage = criticalError instanceof Error ? criticalError.message : String(criticalError);
      
      console.error(`💥 Critical inventory processing error for ${transactionId}:`, criticalError);

      // Log critical failure
      await this.logInventoryProcessingResult({
        transactionId,
        syncStatus: 'failed',
        itemsProcessed: processedItems.length,
        totalItems: items.length,
        errors: [`Critical error: ${errorMessage}`],
        processingTime,
        affectedItems: allAffectedItems
      });

      toast.error(`❌ Critical inventory sync error: ${errorMessage.substring(0, 100)}`);

      return {
        success: false,
        transactionId,
        itemsProcessed: processedItems.length,
        totalItems: items.length,
        syncStatus: 'failed',
        errors: [`Critical error: ${errorMessage}`],
        processingTime,
        affectedItems: allAffectedItems
      };
    }
  }

  /**
   * Process individual item with comprehensive error handling
   */
  private static async processItemSafely(item: any, transactionId: string) {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Item processing timeout')), 15000)
    );

    const processing = deductIngredientsWithNetworkResilience(
      item.productId,
      item.quantity,
      transactionId
    );

    return Promise.race([processing, timeout]);
  }

  /**
   * Create processing batches for controlled concurrency
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Determine sync status based on success rate
   */
  private static determineSyncStatus(processed: number, total: number): 'success' | 'partial' | 'failed' {
    if (processed === 0) return 'failed';
    if (processed === total) return 'success';
    return 'partial';
  }

  /**
   * Log processing result with network-safe RPC call
   */
  private static async logInventoryProcessingResult(params: {
    transactionId: string;
    syncStatus: string;
    itemsProcessed: number;
    totalItems: number;
    errors: string[];
    processingTime: number;
    affectedItems: AffectedInventoryItem[];
  }) {
    try {
      const { error } = await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: params.transactionId,
        p_sync_status: params.syncStatus,
        p_error_details: params.errors.length > 0 ? params.errors.join('; ') : null,
        p_items_processed: params.itemsProcessed,
        p_sync_duration_ms: params.processingTime,
        p_affected_inventory_items: JSON.stringify(params.affectedItems)
      });

      if (error) {
        console.warn('⚠️ Failed to log inventory sync result:', error);
      } else {
        console.log(`📊 Logged inventory sync result for ${params.transactionId}`);
      }
    } catch (logError) {
      console.warn('⚠️ Network error logging inventory sync result:', logError);
    }
  }

  /**
   * Show user-friendly notifications
   */
  private static showUserNotification(
    syncStatus: string,
    processed: number,
    total: number,
    errors: string[]
  ) {
    switch (syncStatus) {
      case 'success':
        toast.success(`✅ Inventory updated successfully (${processed} items)`);
        break;
      case 'partial':
        toast.warning(
          `⚠️ Inventory partially updated: ${processed}/${total} items processed`,
          {
            description: errors.length > 0 ? `First error: ${errors[0].substring(0, 80)}...` : undefined
          }
        );
        break;
      case 'failed':
        toast.error(
          `❌ Inventory sync failed for all ${total} items`,
          {
            description: errors.length > 0 ? `Error: ${errors[0].substring(0, 80)}...` : undefined
          }
        );
        break;
    }
  }

  /**
   * Get processing status for a transaction
   */
  static getProcessingStatus(transactionId: string): 'processing' | 'completed' | 'not_found' {
    return this.processingQueue.has(transactionId) ? 'processing' : 'not_found';
  }

  /**
   * Wait for processing completion
   */
  static async waitForProcessing(
    transactionId: string, 
    timeout: number = 30000
  ): Promise<InventoryProcessingResult | null> {
    const processingPromise = this.processingQueue.get(transactionId);
    if (!processingPromise) {
      return null;
    }

    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), timeout)
    );

    return Promise.race([processingPromise, timeoutPromise]);
  }

  /**
   * Clear processing queue (for testing/reset)
   */
  static clearQueue(): void {
    this.processingQueue.clear();
    console.log('🗑️ Inventory processing queue cleared');
  }
}