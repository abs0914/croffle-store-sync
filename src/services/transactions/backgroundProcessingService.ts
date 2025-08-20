import { toast } from "sonner";
import { processProductSale } from "@/services/productCatalog/inventoryIntegrationService";
import { Transaction } from "@/types";
import { BackgroundQueue } from "@/services/processing/backgroundQueue";
import { InventoryCacheService } from "@/services/cache/inventoryCacheService";

/**
 * Enhanced background processing service with queue management
 */
export class BackgroundProcessingService {
  private static queue = BackgroundQueue.getInstance();

  /**
   * Process inventory deductions in the background with queue management
   */
  static async processInventoryInBackground(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<string> {
    console.log('🚀 Queuing inventory processing for:', transactionId);
    
    const jobId = this.queue.addJob({
      type: 'inventory_sync',
      data: { transactionId, items, storeId },
      priority: 'high',
      maxRetries: 3,
      processor: async (data) => {
        return this.executeInventoryProcessing(data.transactionId, data.items, data.storeId);
      }
    });

    // Don't wait for completion, return job ID for tracking
    return jobId;
  }

  private static async executeInventoryProcessing(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<void> {
    const startTime = Date.now();
    const failedItems: string[] = [];

    // Process all items in parallel for maximum speed
    const inventoryPromises = items.map(async (item) => {
      try {
        const success = await processProductSale(
          item.productId,
          item.quantity,
          transactionId,
          storeId
        );

        if (!success) {
          failedItems.push(item.product?.name || item.productId);
          console.warn(`⚠️ Inventory processing failed for: ${item.productId}`);
        } else {
          // Update cache after successful inventory processing
          InventoryCacheService.invalidateStoreCache(storeId);
        }

        return success;
      } catch (error) {
        console.error(`❌ Error processing inventory for ${item.productId}:`, error);
        failedItems.push(item.product?.name || item.productId);
        return false;
      }
    });

    const results = await Promise.all(inventoryPromises);
    const successCount = results.filter(result => result).length;
    const processingTime = Date.now() - startTime;

    console.log(`📊 Background inventory processing stats:`, {
      transactionId,
      totalItems: items.length,
      successCount,
      failedCount: failedItems.length,
      processingTime: `${processingTime}ms`
    });

    // Show success/failure notifications
    if (failedItems.length === 0) {
      toast.success(`Inventory updated for ${successCount} items (${processingTime}ms)`);
    } else {
      toast.warning(`Inventory partially updated: ${successCount}/${items.length} items processed`);
    }
  }

  /**
   * Process receipt generation in background
   */
  static async processReceiptInBackground(transaction: Transaction): Promise<string> {
    console.log('📄 Queuing receipt generation for:', transaction.id);
    
    const jobId = this.queue.addJob({
      type: 'receipt_generation',
      data: { transaction },
      priority: 'normal',
      maxRetries: 2,
      processor: async (data) => {
        // Simulate receipt processing (PDF generation, email sending, etc.)
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('✅ Receipt processing completed for:', data.transaction.id);
        return { success: true };
      }
    });

    return jobId;
  }

  /**
   * Process analytics updates in background
   */
  static async processAnalyticsInBackground(transactionData: any): Promise<string> {
    const jobId = this.queue.addJob({
      type: 'analytics',
      data: transactionData,
      priority: 'low',
      maxRetries: 1,
      processor: async (data) => {
        // Analytics processing logic here
        console.log('📈 Processing analytics for transaction:', data.transactionId);
        return { success: true };
      }
    });

    return jobId;
  }

  /**
   * Refresh inventory cache in background
   */
  static async refreshCacheInBackground(storeId: string): Promise<string> {
    const jobId = this.queue.addJob({
      type: 'cache_refresh',
      data: { storeId },
      priority: 'low',
      maxRetries: 1,
      processor: async (data) => {
        InventoryCacheService.invalidateStoreCache(data.storeId);
        await InventoryCacheService.preloadStoreCache(data.storeId);
        console.log('🔄 Cache refreshed for store:', data.storeId);
        return { success: true };
      }
    });

    return jobId;
  }

  /**
   * Get processing stats
   */
  static getProcessingStats() {
    return this.queue.getStats();
  }

  /**
   * Wait for job completion
   */
  static async waitForJob(jobId: string, timeout?: number): Promise<boolean> {
    return this.queue.waitForJob(jobId, timeout);
  }
}