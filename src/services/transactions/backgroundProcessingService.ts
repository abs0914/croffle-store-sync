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
   * Process inventory deductions using both simple and enhanced approaches
   */
  static async processInventoryInBackground(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<string> {
    console.log('🚀 Processing inventory with fallback strategy for:', transactionId);
    
    try {
      // First try the simple network-resilient approach for direct inventory items
      const { SimpleNetworkResilientInventoryService } = await import('./simpleNetworkResilientInventoryService');
      
      // Then process any remaining recipe-based items with the enhanced tracker
      const { deductIngredientsWithTracking } = await import('../inventory/productInventoryTracker');
      
      // CRITICAL FIX: Actually await the Promise.all to catch failures
      await Promise.all([
        SimpleNetworkResilientInventoryService.processInventoryWithNetworkResilience(
          transactionId,
          items,
          storeId
        ),
        // Also try with the enhanced tracker for recipe-based products
        ...items.map(item => 
          deductIngredientsWithTracking(item.productId, item.quantity, transactionId)
            .catch(error => {
              console.warn(`Item ${item.productId} enhanced processing failed:`, error);
              // Don't throw here to allow partial success
              return null;
            })
        )
      ]);

      console.log('✅ Combined inventory processing completed for:', transactionId);
      
      // Return transaction ID as job ID for compatibility
      return `combined_${transactionId}`;
      
    } catch (error) {
      console.error('❌ Combined inventory processing failed:', error);
      // Throw the error so calling code knows the operation failed
      throw new Error(`Inventory processing failed: ${error.message}`);
    }
  }

  private static async executeInventoryProcessing(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<void> {
    const startTime = Date.now();
    const failedItems: string[] = [];
    let successCount = 0;

    // Import supabase for audit logging
    const { supabase } = await import('@/integrations/supabase/client');

    try {
      // Process items sequentially to avoid overwhelming the system
      for (const item of items) {
        try {
          console.log(`🔄 Processing inventory for: ${item.product?.name || item.productId}`);
          
          const success = await processProductSale(
            item.productId,
            item.quantity,
            transactionId,
            storeId
          );

          if (success) {
            successCount++;
            console.log(`✅ Successfully processed: ${item.product?.name || item.productId}`);
            
            // Update cache after successful inventory processing
            InventoryCacheService.invalidateStoreCache(storeId);
          } else {
            const errorMsg = `Inventory processing failed for: ${item.product?.name || item.productId}`;
            failedItems.push(errorMsg);
            console.warn(`⚠️ ${errorMsg}`);
          }

        } catch (error) {
          const errorMsg = `Error processing inventory for ${item.product?.name || item.productId}: ${error.message}`;
          console.error(`❌ ${errorMsg}`, error);
          failedItems.push(errorMsg);
        }
      }

      const processingTime = Date.now() - startTime;
      const syncStatus = failedItems.length === 0 ? 'success' : failedItems.length < items.length ? 'partial' : 'failed';

      // Log the sync result to audit table
      try {
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: syncStatus,
          p_error_details: failedItems.length > 0 ? failedItems.join('; ') : null,
          p_items_processed: successCount,
          p_sync_duration_ms: processingTime
        });
      } catch (auditError) {
        console.error('Failed to log sync result:', auditError);
      }

      console.log(`📊 Background inventory processing stats:`, {
        transactionId,
        totalItems: items.length,
        successCount,
        failedCount: failedItems.length,
        processingTime: `${processingTime}ms`,
        syncStatus
      });

      // Show appropriate notifications
      if (failedItems.length === 0) {
        toast.success(`✅ Inventory updated for ${successCount} items (${processingTime}ms)`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ Inventory partially updated: ${successCount}/${items.length} items processed`);
      } else {
        toast.error(`❌ Inventory sync failed for all ${items.length} items`);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Critical error in inventory processing:', error);
      
      // Log critical failure
      try {
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'failed',
          p_error_details: `Critical processing error: ${error.message}`,
          p_items_processed: successCount,
          p_sync_duration_ms: processingTime
        });
      } catch (auditError) {
        console.error('Failed to log critical failure:', auditError);
      }

      toast.error(`❌ Critical inventory sync error for transaction ${transactionId}`);
      throw error;
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