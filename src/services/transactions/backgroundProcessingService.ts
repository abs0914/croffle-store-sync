import { toast } from "sonner";
import { processProductSale } from "@/services/productCatalog/inventoryIntegrationService";
import { Transaction } from "@/types";

/**
 * Background processing service for non-blocking operations
 */
export class BackgroundProcessingService {
  private static processingQueue: Map<string, Promise<void>> = new Map();

  /**
   * Process inventory deductions in the background
   */
  static async processInventoryInBackground(
    transactionId: string,
    items: any[],
    storeId: string
  ): Promise<void> {
    console.log('🚀 Starting background inventory processing for:', transactionId);
    
    const processingPromise = this.executeInventoryProcessing(transactionId, items, storeId);
    this.processingQueue.set(transactionId, processingPromise);

    try {
      await processingPromise;
      console.log('✅ Background inventory processing completed for:', transactionId);
    } catch (error) {
      console.error('❌ Background inventory processing failed for:', transactionId, error);
      toast.error("Inventory sync failed - please check transaction status");
    } finally {
      this.processingQueue.delete(transactionId);
    }
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
   * Check if a transaction is still being processed
   */
  static isProcessing(transactionId: string): boolean {
    return this.processingQueue.has(transactionId);
  }

  /**
   * Get processing status for a transaction
   */
  static async waitForProcessing(transactionId: string): Promise<void> {
    const processingPromise = this.processingQueue.get(transactionId);
    if (processingPromise) {
      await processingPromise;
    }
  }

  /**
   * Process transaction receipt generation in background
   */
  static async processReceiptInBackground(transaction: Transaction): Promise<void> {
    console.log('📄 Processing receipt generation in background for:', transaction.id);
    
    // Simulate receipt processing (could be PDF generation, email sending, etc.)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ Receipt processing completed for:', transaction.id);
  }
}