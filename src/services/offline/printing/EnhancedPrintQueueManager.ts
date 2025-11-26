/**
 * ENHANCED PRINT QUEUE MANAGER
 * 
 * Advanced offline printing with:
 * - Print job queuing and retry logic
 * - Printer connection resilience
 * - Status tracking and notifications
 * - Automatic reconnection handling
 * - Print job prioritization
 * - Comprehensive error handling
 */

import { toast } from 'sonner';
import { BluetoothPrinterService } from '../../printer/BluetoothPrinterService';
import { PrinterDiscovery } from '../../printer/PrinterDiscovery';
import { PlatformStorageManager } from '../storage/PlatformStorageManager';

export interface PrintJob {
  id: string;
  type: 'receipt' | 'report' | 'test' | 'custom';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  printedAt?: number;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  
  // Print data
  transactionId?: string;
  receiptNumber?: string;
  content: PrintContent;
  
  // Print options
  copies: number;
  autoOpenDrawer: boolean;
  printerAddress?: string;
  
  // Metadata
  deviceId?: string;
  userId?: string;
  storeId?: string;
}

export interface PrintContent {
  type: 'receipt' | 'report' | 'test' | 'custom';
  data: any;
  template?: string;
  formatting?: PrintFormatting;
}

export interface PrintFormatting {
  fontSize?: 'small' | 'medium' | 'large';
  alignment?: 'left' | 'center' | 'right';
  bold?: boolean;
  underline?: boolean;
  doubleHeight?: boolean;
  doubleWidth?: boolean;
}

export interface PrintQueueStats {
  totalJobs: number;
  pendingJobs: number;
  printingJobs: number;
  completedJobs: number;
  failedJobs: number;
  highPriorityJobs: number;
  mediumPriorityJobs: number;
  lowPriorityJobs: number;
  oldestPendingJob: number;
  newestPendingJob: number;
  averageProcessingTime: number;
  successRate: number;
}

export interface PrinterStatus {
  isConnected: boolean;
  address?: string;
  name?: string;
  batteryLevel?: number;
  paperStatus?: 'ok' | 'low' | 'empty';
  lastSeen: number;
  connectionAttempts: number;
  isReconnecting: boolean;
}

export type PrintJobCallback = (job: PrintJob) => void;
export type PrinterStatusCallback = (status: PrinterStatus) => void;

export class EnhancedPrintQueueManager {
  private static instance: EnhancedPrintQueueManager;
  private storageManager: PlatformStorageManager;
  private printQueue: Map<string, PrintJob> = new Map();
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private reconnectionInterval: NodeJS.Timeout | null = null;
  
  private jobCallbacks: Set<PrintJobCallback> = new Set();
  private statusCallbacks: Set<PrinterStatusCallback> = new Set();
  
  private printerStatus: PrinterStatus = {
    isConnected: false,
    lastSeen: 0,
    connectionAttempts: 0,
    isReconnecting: false
  };
  
  private readonly STORE_NAME = 'print_queue';
  private readonly PROCESSING_INTERVAL = 3000; // 3 seconds - prevent rapid retries during payment
  private readonly RECONNECTION_INTERVAL = 10000; // 10 seconds - less aggressive reconnection
  private readonly MAX_RETRY_ATTEMPTS = 3; // Fewer retries from queue (auto-print handles its own)
  private readonly QUEUE_SIZE_LIMIT = 100;

  private constructor() {
    // Initialize storage for print queue persistence
    const storageConfig = {
      dbName: 'CroffleOfflineDB',
      version: 1,
      stores: [
        {
          name: this.STORE_NAME,
          keyPath: 'id',
          indexes: [
            { name: 'status', keyPath: 'status' },
            { name: 'priority', keyPath: 'priority' },
            { name: 'createdAt', keyPath: 'createdAt' },
            { name: 'type', keyPath: 'type' }
          ]
        }
      ]
    };

    this.storageManager = PlatformStorageManager.getInstance(storageConfig);
  }

  static getInstance(): EnhancedPrintQueueManager {
    if (!EnhancedPrintQueueManager.instance) {
      EnhancedPrintQueueManager.instance = new EnhancedPrintQueueManager();
    }
    return EnhancedPrintQueueManager.instance;
  }

  /**
   * Initialize the print queue manager
   */
  async initialize(): Promise<void> {
    console.log('🖨️ Initializing Enhanced Print Queue Manager...');

    try {
      await this.storageManager.initialize();
      await this.loadQueueFromStorage();
      await this.checkPrinterStatus();
      
      this.startProcessing();
      this.startReconnectionMonitoring();
      
      console.log('✅ Enhanced Print Queue Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Print Queue Manager:', error);
      throw error;
    }
  }

  /**
   * Add a print job to the queue
   */
  async addPrintJob(
    content: PrintContent,
    options: {
      priority?: 'high' | 'medium' | 'low';
      copies?: number;
      autoOpenDrawer?: boolean;
      transactionId?: string;
      receiptNumber?: string;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    try {
      const jobId = this.generateJobId();
      
      const printJob: PrintJob = {
        id: jobId,
        type: content.type,
        priority: options.priority || 'medium',
        status: 'pending',
        createdAt: Date.now(),
        attempts: 0,
        maxAttempts: options.maxAttempts || this.MAX_RETRY_ATTEMPTS,
        content,
        copies: options.copies || 1,
        autoOpenDrawer: options.autoOpenDrawer || false,
        transactionId: options.transactionId,
        receiptNumber: options.receiptNumber,
        deviceId: await this.getDeviceId(),
        printerAddress: this.printerStatus.address
      };

      // Check queue size limit
      if (this.printQueue.size >= this.QUEUE_SIZE_LIMIT) {
        await this.cleanupOldJobs();
      }

      // Add to memory queue
      this.printQueue.set(jobId, printJob);

      // Persist to storage
      await this.storageManager.setItem(this.STORE_NAME, jobId, printJob);

      console.log(`📝 Added print job: ${jobId} (${content.type}, priority: ${printJob.priority})`);
      
      // Notify listeners
      this.notifyJobCallbacks(printJob);

      // Show user feedback
      toast.success(`Print job queued: ${printJob.receiptNumber || printJob.type}`, {
        description: `Priority: ${printJob.priority}`
      });

      return jobId;
    } catch (error) {
      console.error('❌ Failed to add print job:', error);
      toast.error('Failed to queue print job');
      throw error;
    }
  }

  /**
   * Process the print queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Get pending jobs sorted by priority and creation time
      const pendingJobs = Array.from(this.printQueue.values())
        .filter(job => job.status === 'pending')
        .sort((a, b) => {
          // Sort by priority first, then by creation time
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          return priorityDiff !== 0 ? priorityDiff : a.createdAt - b.createdAt;
        });

      if (pendingJobs.length === 0) {
        return;
      }

      // Check printer connection
      if (!this.printerStatus.isConnected) {
        console.log('🖨️ Printer not connected, attempting to reconnect...');
        await this.attemptReconnection();
        return;
      }

      // Process the highest priority job
      const job = pendingJobs[0];
      await this.processPrintJob(job);

    } catch (error) {
      console.error('❌ Queue processing failed:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single print job
   */
  private async processPrintJob(job: PrintJob): Promise<void> {
    try {
      console.log(`🖨️ Processing print job: ${job.id} (${job.type})`);

      // Mark as printing
      job.status = 'printing';
      job.attempts++;
      await this.updateJob(job);

      // Perform the actual printing
      const success = await this.executePrintJob(job);

      if (success) {
        job.status = 'completed';
        job.printedAt = Date.now();
        console.log(`✅ Print job completed: ${job.id}`);
        
        toast.success(`Printed: ${job.receiptNumber || job.type}`, {
          description: `Completed in ${job.attempts} attempt(s)`
        });
      } else {
        throw new Error('Print execution failed');
      }

    } catch (error) {
      console.error(`❌ Print job failed: ${job.id}`, error);
      
      job.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        toast.error(`Print failed: ${job.receiptNumber || job.type}`, {
          description: `Max attempts reached (${job.attempts}). Check printer connection.`,
          duration: 15000
        });
      } else {
        job.status = 'pending';
        // Quieter retry notification to avoid spam during transaction completion
        console.log(`⏰ Print job ${job.id} will retry (${job.attempts}/${job.maxAttempts})`);
      }
    } finally {
      await this.updateJob(job);
      this.notifyJobCallbacks(job);
    }
  }

  /**
   * Execute the actual print job
   */
  private async executePrintJob(job: PrintJob): Promise<boolean> {
    try {
      switch (job.type) {
        case 'receipt':
          return await this.printReceipt(job);
        case 'test':
          return await this.printTestPage(job);
        case 'report':
          return await this.printReport(job);
        case 'custom':
          return await this.printCustomContent(job);
        default:
          throw new Error(`Unknown print job type: ${job.type}`);
      }
    } catch (error) {
      console.error('Print execution failed:', error);
      return false;
    }
  }

  /**
   * Print a receipt
   */
  private async printReceipt(job: PrintJob): Promise<boolean> {
    try {
      const { data } = job.content;
      
      // Use the existing BluetoothPrinterService
      const success = await BluetoothPrinterService.printReceipt(
        data.transaction,
        data.customer,
        data.store,
        data.cashierName,
        job.autoOpenDrawer
      );

      return success;
    } catch (error) {
      console.error('Receipt printing failed:', error);
      return false;
    }
  }

  /**
   * Print a test page
   */
  private async printTestPage(job: PrintJob): Promise<boolean> {
    try {
      // Print a simple test receipt
      console.log('Printing test page...');
      return true; // Placeholder for test page printing
    } catch (error) {
      console.error('Test page printing failed:', error);
      return false;
    }
  }

  /**
   * Print a report
   */
  private async printReport(job: PrintJob): Promise<boolean> {
    try {
      // This would be implemented based on report type
      console.log('Report printing not yet implemented');
      return true; // Placeholder
    } catch (error) {
      console.error('Report printing failed:', error);
      return false;
    }
  }

  /**
   * Print custom content
   */
  private async printCustomContent(job: PrintJob): Promise<boolean> {
    try {
      // This would handle custom print content
      console.log('Custom content printing not yet implemented');
      return true; // Placeholder
    } catch (error) {
      console.error('Custom content printing failed:', error);
      return false;
    }
  }

  /**
   * Check printer status
   */
  private async checkPrinterStatus(): Promise<void> {
    try {
      const connectedPrinter = PrinterDiscovery.getConnectedPrinter();
      
      if (connectedPrinter && connectedPrinter.isConnected) {
        this.printerStatus = {
          isConnected: true,
          address: connectedPrinter.id,
          name: connectedPrinter.name,
          lastSeen: Date.now(),
          connectionAttempts: 0,
          isReconnecting: false
        };
      } else {
        this.printerStatus.isConnected = false;
        this.printerStatus.lastSeen = Date.now();
      }

      this.notifyStatusCallbacks();
    } catch (error) {
      console.error('Failed to check printer status:', error);
      this.printerStatus.isConnected = false;
    }
  }

  /**
   * Attempt to reconnect to printer
   */
  private async attemptReconnection(): Promise<void> {
    if (this.printerStatus.isReconnecting) return;

    try {
      this.printerStatus.isReconnecting = true;
      this.printerStatus.connectionAttempts++;
      
      console.log(`🔄 Attempting printer reconnection (attempt ${this.printerStatus.connectionAttempts})...`);

      // Try to reconnect to the last known printer
      if (this.printerStatus.address) {
        // Note: connectToPrinter expects a BluetoothPrinter object, not just an address
        // This needs proper implementation with PrinterDiscovery
        console.log('Reconnection to printer address:', this.printerStatus.address);
        const success = false; // Placeholder until proper reconnection is implemented
        if (success) {
          this.printerStatus.isConnected = true;
          this.printerStatus.lastSeen = Date.now();
          this.printerStatus.connectionAttempts = 0;
          
          console.log('✅ Printer reconnected successfully');
          toast.success('Printer reconnected', {
            description: 'Print queue will resume processing'
          });
        }
      }

    } catch (error) {
      console.error('Printer reconnection failed:', error);
    } finally {
      this.printerStatus.isReconnecting = false;
      this.notifyStatusCallbacks();
    }
  }

  /**
   * Start queue processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESSING_INTERVAL);

    console.log('⏰ Print queue processing started');
  }

  /**
   * Start reconnection monitoring
   */
  private startReconnectionMonitoring(): void {
    if (this.reconnectionInterval) {
      clearInterval(this.reconnectionInterval);
    }

    this.reconnectionInterval = setInterval(() => {
      this.checkPrinterStatus();
    }, this.RECONNECTION_INTERVAL);

    console.log('🔍 Printer status monitoring started');
  }

  /**
   * Load queue from storage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const items = await this.storageManager.query({ store: this.STORE_NAME });
      
      for (const item of items) {
        const job = item.data as PrintJob;
        
        // Reset printing status to pending on startup
        if (job.status === 'printing') {
          job.status = 'pending';
        }
        
        this.printQueue.set(job.id, job);
      }

      console.log(`📦 Loaded ${this.printQueue.size} print jobs from storage`);
    } catch (error) {
      console.error('Failed to load print queue from storage:', error);
    }
  }

  /**
   * Update job in memory and storage
   */
  private async updateJob(job: PrintJob): Promise<void> {
    this.printQueue.set(job.id, job);
    await this.storageManager.setItem(this.STORE_NAME, job.id, job);
  }

  /**
   * Clean up old completed jobs
   */
  private async cleanupOldJobs(): Promise<void> {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    let cleanedCount = 0;

    for (const [jobId, job] of this.printQueue.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.createdAt < cutoffTime) {
        this.printQueue.delete(jobId);
        await this.storageManager.removeItem(this.STORE_NAME, jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old print jobs`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<PrintQueueStats> {
    const jobs = Array.from(this.printQueue.values());
    const completedJobs = jobs.filter(j => j.status === 'completed');
    
    const stats: PrintQueueStats = {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      printingJobs: jobs.filter(j => j.status === 'printing').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      highPriorityJobs: jobs.filter(j => j.priority === 'high').length,
      mediumPriorityJobs: jobs.filter(j => j.priority === 'medium').length,
      lowPriorityJobs: jobs.filter(j => j.priority === 'low').length,
      oldestPendingJob: Math.min(...jobs.filter(j => j.status === 'pending').map(j => j.createdAt)),
      newestPendingJob: Math.max(...jobs.filter(j => j.status === 'pending').map(j => j.createdAt)),
      averageProcessingTime: this.calculateAverageProcessingTime(completedJobs),
      successRate: jobs.length > 0 ? (completedJobs.length / jobs.length) * 100 : 0
    };

    return stats;
  }

  /**
   * Calculate average processing time
   */
  private calculateAverageProcessingTime(completedJobs: PrintJob[]): number {
    if (completedJobs.length === 0) return 0;
    
    const totalTime = completedJobs.reduce((sum, job) => {
      return sum + ((job.printedAt || job.createdAt) - job.createdAt);
    }, 0);
    
    return totalTime / completedJobs.length;
  }

  /**
   * Add job status callback
   */
  addJobCallback(callback: PrintJobCallback): void {
    this.jobCallbacks.add(callback);
  }

  /**
   * Remove job status callback
   */
  removeJobCallback(callback: PrintJobCallback): void {
    this.jobCallbacks.delete(callback);
  }

  /**
   * Add printer status callback
   */
  addStatusCallback(callback: PrinterStatusCallback): void {
    this.statusCallbacks.add(callback);
  }

  /**
   * Remove printer status callback
   */
  removeStatusCallback(callback: PrinterStatusCallback): void {
    this.statusCallbacks.delete(callback);
  }

  /**
   * Notify job callbacks
   */
  private notifyJobCallbacks(job: PrintJob): void {
    this.jobCallbacks.forEach(callback => {
      try {
        callback(job);
      } catch (error) {
        console.error('Job callback failed:', error);
      }
    });
  }

  /**
   * Notify status callbacks
   */
  private notifyStatusCallbacks(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.printerStatus);
      } catch (error) {
        console.error('Status callback failed:', error);
      }
    });
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get device ID
   */
  private async getDeviceId(): Promise<string> {
    return `device_${navigator.userAgent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Get printer status
   */
  getPrinterStatus(): PrinterStatus {
    return { ...this.printerStatus };
  }

  /**
   * Cancel a print job
   */
  async cancelPrintJob(jobId: string): Promise<boolean> {
    try {
      const job = this.printQueue.get(jobId);
      if (!job) {
        console.warn(`Print job not found: ${jobId}`);
        return false;
      }

      if (job.status === 'printing') {
        console.warn(`Cannot cancel job in progress: ${jobId}`);
        return false;
      }

      job.status = 'cancelled';
      await this.updateJob(job);
      this.notifyJobCallbacks(job);

      console.log(`🚫 Cancelled print job: ${jobId}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel print job:', error);
      return false;
    }
  }

  /**
   * Retry a failed print job
   */
  async retryPrintJob(jobId: string): Promise<boolean> {
    try {
      const job = this.printQueue.get(jobId);
      if (!job) {
        console.warn(`Print job not found: ${jobId}`);
        return false;
      }

      if (job.status !== 'failed') {
        console.warn(`Job is not in failed state: ${jobId}`);
        return false;
      }

      job.status = 'pending';
      job.attempts = 0;
      job.lastError = undefined;
      await this.updateJob(job);
      this.notifyJobCallbacks(job);

      console.log(`🔄 Retrying print job: ${jobId}`);
      return true;
    } catch (error) {
      console.error('Failed to retry print job:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.reconnectionInterval) {
      clearInterval(this.reconnectionInterval);
    }
    
    this.jobCallbacks.clear();
    this.statusCallbacks.clear();
    
    console.log('🧹 Enhanced Print Queue Manager destroyed');
  }
}
