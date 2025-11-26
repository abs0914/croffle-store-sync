/**
 * PRINT COORDINATOR
 * 
 * Single source of truth for all receipt printing operations.
 * Ensures idempotency, tracks status globally, and prevents duplicate prints.
 */

import { BluetoothPrinterService } from './BluetoothPrinterService';
import { PrinterDiscovery } from './PrinterDiscovery';
import { Transaction, Customer } from '@/types';
import { Store } from '@/types/store';
import { toast } from 'sonner';

interface PrintJobRequest {
  transactionId: string;
  receiptNumber: string;
  transaction: Transaction;
  customer?: Customer | null;
  store?: Store;
  cashierName?: string;
  autoOpenDrawer?: boolean;
}

interface PrintJobStatus {
  status: 'pending' | 'printing' | 'completed' | 'failed';
  attemptCount: number;
  lastAttempt?: number;
  error?: string;
}

export class PrintCoordinator {
  private static instance: PrintCoordinator;
  
  // Track print jobs by receipt number for idempotency
  private printJobs: Map<string, PrintJobStatus> = new Map();
  
  // Store print requests for retry
  private printRequests: Map<string, PrintJobRequest> = new Map();
  
  // Maximum retry attempts
  private readonly MAX_RETRIES = 3;
  
  // Retry delays (exponential backoff)
  private readonly RETRY_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s

  private constructor() {
    this.loadPersistedStatus();
  }

  static getInstance(): PrintCoordinator {
    if (!PrintCoordinator.instance) {
      PrintCoordinator.instance = new PrintCoordinator();
    }
    return PrintCoordinator.instance;
  }

  /**
   * Main entry point for printing a receipt
   * Returns true if print was successful or already printed
   */
  async printReceipt(request: PrintJobRequest): Promise<boolean> {
    const { receiptNumber, transactionId } = request;
    
    console.log(`📋 [PRINT-COORDINATOR] Print request for receipt: ${receiptNumber}`);

    // Check if already printed successfully
    const existingStatus = this.printJobs.get(receiptNumber);
    if (existingStatus?.status === 'completed') {
      console.log(`✅ [PRINT-COORDINATOR] Receipt ${receiptNumber} already printed successfully`);
      return true;
    }

    // Check if currently printing
    if (existingStatus?.status === 'printing') {
      console.log(`⏳ [PRINT-COORDINATOR] Receipt ${receiptNumber} is currently being printed`);
      return false;
    }

    // Store the request for potential retry
    this.printRequests.set(receiptNumber, request);

    // Initialize or update status
    const currentAttempt = (existingStatus?.attemptCount || 0) + 1;
    this.updateStatus(receiptNumber, {
      status: 'printing',
      attemptCount: currentAttempt,
      lastAttempt: Date.now()
    });

    // Check printer connection
    const printer = PrinterDiscovery.getConnectedPrinter();
    if (!printer?.isConnected) {
      console.warn(`⚠️ [PRINT-COORDINATOR] No printer connected for receipt ${receiptNumber}`);
      
      // Mark as failed but don't retry immediately
      this.updateStatus(receiptNumber, {
        status: 'failed',
        attemptCount: currentAttempt,
        lastAttempt: Date.now(),
        error: 'No printer connected'
      });

      // Only show toast on first attempt
      if (currentAttempt === 1) {
        toast.error('Printer not connected', {
          description: 'Receipt will be queued for later'
        });
      }

      return false;
    }

    // Attempt to print
    try {
      console.log(`🖨️ [PRINT-COORDINATOR] Printing receipt ${receiptNumber} (attempt ${currentAttempt}/${this.MAX_RETRIES})`);
      
      const success = await BluetoothPrinterService.printReceipt(
        request.transaction,
        request.customer,
        request.store,
        request.cashierName,
        request.autoOpenDrawer
      );

      if (success) {
        console.log(`✅ [PRINT-COORDINATOR] Receipt ${receiptNumber} printed successfully`);
        
        this.updateStatus(receiptNumber, {
          status: 'completed',
          attemptCount: currentAttempt,
          lastAttempt: Date.now()
        });

        // Notify EnhancedPrintQueueManager to remove any queued jobs for this receipt
        this.notifyPrintComplete(receiptNumber);

        // Show success toast only on first attempt or after retries
        if (currentAttempt === 1) {
          toast.success('Receipt printed successfully');
        } else {
          toast.success('Receipt printed after retry');
        }

        // Clean up request after successful print
        this.printRequests.delete(receiptNumber);
        
        return true;
      } else {
        throw new Error('Print service returned false');
      }
    } catch (error) {
      console.error(`❌ [PRINT-COORDINATOR] Failed to print receipt ${receiptNumber}:`, error);
      
      this.updateStatus(receiptNumber, {
        status: 'failed',
        attemptCount: currentAttempt,
        lastAttempt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Schedule retry if under max attempts
      if (currentAttempt < this.MAX_RETRIES) {
        this.scheduleRetry(receiptNumber, currentAttempt);
      } else {
        console.log(`❌ [PRINT-COORDINATOR] Max retries reached for receipt ${receiptNumber}`);
        toast.error('Failed to print receipt', {
          description: 'Maximum retry attempts reached'
        });
        
        // Clean up after max retries
        this.printRequests.delete(receiptNumber);
      }

      return false;
    }
  }

  /**
   * Schedule a retry attempt with exponential backoff
   */
  private scheduleRetry(receiptNumber: string, attemptNumber: number): void {
    const delay = this.RETRY_DELAYS[attemptNumber - 1] || 8000;
    
    console.log(`🔄 [PRINT-COORDINATOR] Scheduling retry for ${receiptNumber} in ${delay}ms`);

    setTimeout(async () => {
      const request = this.printRequests.get(receiptNumber);
      if (!request) {
        console.log(`⚠️ [PRINT-COORDINATOR] Print request for ${receiptNumber} no longer exists`);
        return;
      }

      console.log(`🔄 [PRINT-COORDINATOR] Retrying print for ${receiptNumber}...`);
      await this.printReceipt(request);
    }, delay);
  }

  /**
   * Check if a receipt has been printed
   */
  isPrinted(receiptNumber: string): boolean {
    const status = this.printJobs.get(receiptNumber);
    return status?.status === 'completed';
  }

  /**
   * Check if a receipt is currently printing
   */
  isPrinting(receiptNumber: string): boolean {
    const status = this.printJobs.get(receiptNumber);
    return status?.status === 'printing';
  }

  /**
   * Get status of a print job
   */
  getStatus(receiptNumber: string): PrintJobStatus | undefined {
    return this.printJobs.get(receiptNumber);
  }

  /**
   * Clear completed print jobs older than 1 hour
   */
  clearOldJobs(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [receiptNumber, status] of this.printJobs.entries()) {
      if (status.status === 'completed' && status.lastAttempt && status.lastAttempt < oneHourAgo) {
        this.printJobs.delete(receiptNumber);
        this.printRequests.delete(receiptNumber);
      }
    }

    this.persistStatus();
  }

  /**
   * Update print job status
   */
  private updateStatus(receiptNumber: string, status: PrintJobStatus): void {
    this.printJobs.set(receiptNumber, status);
    this.persistStatus();
  }

  /**
   * Persist status to localStorage for recovery after app restart
   */
  private persistStatus(): void {
    try {
      const statusArray = Array.from(this.printJobs.entries());
      localStorage.setItem('print-coordinator-status', JSON.stringify(statusArray));
    } catch (error) {
      console.warn('Failed to persist print status:', error);
    }
  }

  /**
   * Notify print queue manager that printing is complete
   */
  private notifyPrintComplete(receiptNumber: string): void {
    try {
      // Dynamically import to avoid circular dependency
      import('@/services/offline/printing/EnhancedPrintQueueManager').then(({ EnhancedPrintQueueManager }) => {
        const queueManager = EnhancedPrintQueueManager.getInstance();
        queueManager.removeJobsByReceiptNumber(receiptNumber);
      });
    } catch (error) {
      console.warn('[PRINT-COORDINATOR] Could not notify queue manager:', error);
    }
  }

  /**
   * Load persisted status from localStorage
   */
  private loadPersistedStatus(): void {
    try {
      const stored = localStorage.getItem('print-coordinator-status');
      if (stored) {
        const statusArray = JSON.parse(stored);
        this.printJobs = new Map(statusArray);
        
        // Clear old completed jobs on load
        this.clearOldJobs();
        
        console.log(`📋 [PRINT-COORDINATOR] Loaded ${this.printJobs.size} persisted print statuses`);
      }
    } catch (error) {
      console.warn('Failed to load persisted print status:', error);
    }
  }

  /**
   * Reset coordinator (useful for testing)
   */
  reset(): void {
    this.printJobs.clear();
    this.printRequests.clear();
    localStorage.removeItem('print-coordinator-status');
    console.log('🔄 [PRINT-COORDINATOR] Reset complete');
  }
}
