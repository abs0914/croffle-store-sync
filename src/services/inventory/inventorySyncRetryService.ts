import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processProductSale } from "@/services/productCatalog/inventoryIntegrationService";

export interface RetryJob {
  id: string;
  transactionId: string;
  items: any[];
  storeId: string;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  lastAttemptAt?: Date;
  errorDetails?: string;
}

export interface RetryResult {
  success: boolean;
  processedItems: number;
  failedItems: string[];
  errorDetails?: string;
}

/**
 * Enhanced retry service for failed inventory sync jobs
 */
export class InventorySyncRetryService {
  private static instance: InventorySyncRetryService;
  private retryJobs = new Map<string, RetryJob>();
  private processingJobs = new Set<string>();
  private maxRetryAttempts = 5;
  private baseDelayMs = 2000; // 2 seconds base delay
  private maxDelayMs = 300000; // 5 minutes max delay

  private constructor() {
    this.startRetryProcessor();
    this.loadPendingRetries();
  }

  static getInstance(): InventorySyncRetryService {
    if (!this.instance) {
      this.instance = new InventorySyncRetryService();
    }
    return this.instance;
  }

  /**
   * Add failed transaction for retry
   */
  async addRetryJob(transactionId: string, items: any[], storeId: string, errorDetails?: string): Promise<string> {
    const jobId = `retry_${transactionId}_${Date.now()}`;
    
    const retryJob: RetryJob = {
      id: jobId,
      transactionId,
      items,
      storeId,
      attempts: 0,
      maxAttempts: this.maxRetryAttempts,
      status: 'pending',
      createdAt: new Date(),
      errorDetails
    };

    this.retryJobs.set(jobId, retryJob);
    
    // Log retry job creation
    console.log(`🔄 Created retry job for transaction ${transactionId}:`, {
      jobId,
      itemCount: items.length,
      errorDetails
    });

    // Persist to database for admin visibility
    try {
      await supabase
        .from('inventory_sync_audit')
        .upsert({
          transaction_id: transactionId,
          sync_status: 'retry_queued',
          error_details: `Retry job created: ${errorDetails}`,
          items_processed: 0,
          sync_duration_ms: 0
        });
    } catch (error) {
      console.error('Failed to log retry job creation:', error);
    }

    return jobId;
  }

  /**
   * Manual retry for admin tools
   */
  async manualRetry(transactionId: string): Promise<RetryResult> {
    try {
      // Get transaction details
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          store_id,
          transaction_items!inner(
            id,
            product_id,
            quantity,
            name
          )
        `)
        .eq('id', transactionId)
        .single();

      if (txError || !transaction) {
        throw new Error(`Transaction not found: ${transactionId}`);
      }

      const items = transaction.transaction_items.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        product: { name: item.name }
      }));

      return await this.executeRetry(transactionId, items, transaction.store_id);

    } catch (error) {
      console.error(`Manual retry failed for transaction ${transactionId}:`, error);
      return {
        success: false,
        processedItems: 0,
        failedItems: [],
        errorDetails: error.message
      };
    }
  }

  /**
   * Execute retry for a specific transaction
   */
  private async executeRetry(transactionId: string, items: any[], storeId: string): Promise<RetryResult> {
    const startTime = Date.now();
    let processedItems = 0;
    const failedItems: string[] = [];

    try {
      console.log(`🔄 Executing retry for transaction ${transactionId} with ${items.length} items`);

      // Process items sequentially with enhanced error handling
      for (const item of items) {
        try {
          const success = await processProductSale(
            item.productId,
            item.quantity,
            transactionId,
            storeId
          );

          if (success) {
            processedItems++;
            console.log(`✅ Retry successful for item: ${item.product?.name || item.productId}`);
          } else {
            failedItems.push(item.product?.name || item.productId);
            console.warn(`⚠️ Retry failed for item: ${item.product?.name || item.productId}`);
          }

        } catch (itemError) {
          const errorMsg = `Error retrying item ${item.product?.name || item.productId}: ${itemError.message}`;
          console.error(errorMsg, itemError);
          failedItems.push(errorMsg);
        }
      }

      const processingTime = Date.now() - startTime;
      const success = failedItems.length === 0;
      const syncStatus = success ? 'success' : failedItems.length < items.length ? 'partial' : 'failed';

      // Log retry result
      try {
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: `retry_${syncStatus}`,
          p_error_details: failedItems.length > 0 ? `Retry: ${failedItems.join('; ')}` : null,
          p_items_processed: processedItems,
          p_sync_duration_ms: processingTime
        });
      } catch (auditError) {
        console.error('Failed to log retry result:', auditError);
      }

      return {
        success,
        processedItems,
        failedItems,
        errorDetails: failedItems.length > 0 ? failedItems.join(', ') : undefined
      };

    } catch (error) {
      console.error(`Critical error in retry execution for ${transactionId}:`, error);
      
      // Log critical retry failure
      try {
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: transactionId,
          p_sync_status: 'retry_failed',
          p_error_details: `Critical retry error: ${error.message}`,
          p_items_processed: processedItems,
          p_sync_duration_ms: Date.now() - startTime
        });
      } catch (auditError) {
        console.error('Failed to log critical retry failure:', auditError);
      }

      return {
        success: false,
        processedItems,
        failedItems: ['Critical retry error'],
        errorDetails: error.message
      };
    }
  }

  /**
   * Process retry queue automatically
   */
  private startRetryProcessor(): void {
    setInterval(async () => {
      const pendingJobs = Array.from(this.retryJobs.values())
        .filter(job => 
          job.status === 'pending' && 
          !this.processingJobs.has(job.id) &&
          this.shouldRetryNow(job)
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      for (const job of pendingJobs.slice(0, 3)) { // Process max 3 jobs concurrently
        this.processRetryJob(job);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process individual retry job
   */
  private async processRetryJob(job: RetryJob): Promise<void> {
    if (this.processingJobs.has(job.id)) return;

    this.processingJobs.add(job.id);
    job.status = 'processing';
    job.attempts++;
    job.lastAttemptAt = new Date();

    try {
      console.log(`🔄 Processing retry job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

      const result = await this.executeRetry(job.transactionId, job.items, job.storeId);

      if (result.success) {
        job.status = 'completed';
        console.log(`✅ Retry job completed successfully: ${job.id}`);
        toast.success(`✅ Inventory sync retry successful for transaction ${job.transactionId}`);
      } else if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.errorDetails = result.errorDetails;
        console.error(`❌ Retry job permanently failed: ${job.id}`);
        toast.error(`❌ Inventory sync retry failed permanently for transaction ${job.transactionId}`);
      } else {
        job.status = 'pending';
        job.errorDetails = result.errorDetails;
        console.warn(`⚠️ Retry job failed, will retry again: ${job.id}`);
      }

    } catch (error) {
      console.error(`Error processing retry job ${job.id}:`, error);
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        job.errorDetails = error.message;
      } else {
        job.status = 'pending';
        job.errorDetails = error.message;
      }
    } finally {
      this.processingJobs.delete(job.id);
    }
  }

  /**
   * Check if job should be retried now (exponential backoff)
   */
  private shouldRetryNow(job: RetryJob): boolean {
    if (!job.lastAttemptAt) return true;

    const delay = Math.min(
      this.baseDelayMs * Math.pow(2, job.attempts - 1),
      this.maxDelayMs
    );

    return Date.now() - job.lastAttemptAt.getTime() >= delay;
  }

  /**
   * Load pending retries from database on startup
   */
  private async loadPendingRetries(): Promise<void> {
    try {
      // Get transactions with failed syncs that need retry
      const { data: failedSyncs, error } = await supabase
        .from('inventory_sync_audit')
        .select('transaction_id')
        .in('sync_status', ['failed', 'partial'])
        .gte('created_at', new Date(Date.now() - 86400000).toISOString()) // Last 24 hours
        .limit(50);

      if (error || !failedSyncs) return;

      for (const sync of failedSyncs) {
        // Only add if not already in retry queue
        const existingJob = Array.from(this.retryJobs.values())
          .find(job => job.transactionId === sync.transaction_id);

        if (!existingJob) {
          // Get transaction details and add to retry queue
          const { data: transaction } = await supabase
            .from('transactions')
            .select(`
              id,
              store_id,
              transaction_items!inner(
                product_id,
                quantity,
                name
              )
            `)
            .eq('id', sync.transaction_id)
            .single();

          if (transaction) {
            const items = transaction.transaction_items.map(item => ({
              productId: item.product_id,
              quantity: item.quantity,
              product: { name: item.name }
            }));

            await this.addRetryJob(
              sync.transaction_id,
              items,
              transaction.store_id,
              'Loaded pending retry on startup'
            );
          }
        }
      }

      console.log(`🔄 Loaded ${failedSyncs.length} pending retry jobs`);

    } catch (error) {
      console.error('Error loading pending retries:', error);
    }
  }

  /**
   * Get retry job statistics
   */
  getRetryStats() {
    const jobs = Array.from(this.retryJobs.values());
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length
    };
  }

  /**
   * Get all retry jobs for admin interface
   */
  getAllRetryJobs(): RetryJob[] {
    return Array.from(this.retryJobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}