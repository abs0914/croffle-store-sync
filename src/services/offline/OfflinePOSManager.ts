/**
 * OFFLINE POS MANAGER
 * 
 * Main orchestrator for offline POS operations:
 * - Coordinates all offline services
 * - Manages initialization and lifecycle
 * - Provides unified API for offline operations
 * - Handles cross-service communication
 * - Monitors system health and performance
 */

import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { EnhancedOfflineTransactionQueue } from './storage/EnhancedOfflineTransactionQueue';
import { EnhancedNetworkDetectionService } from './network/EnhancedNetworkDetectionService';
import { IntelligentSyncManager } from './sync/IntelligentSyncManager';
import { ConflictResolutionSystem } from './sync/ConflictResolutionSystem';
import { EnhancedPrintQueueManager } from './printing/EnhancedPrintQueueManager';

export interface OfflinePOSStatus {
  isInitialized: boolean;
  isOnline: boolean;
  networkQuality: string;
  
  // Transaction queue status
  pendingTransactions: number;
  failedTransactions: number;
  syncingTransactions: number;
  
  // Sync status
  isSyncing: boolean;
  lastSyncTime?: number;
  nextSyncTime?: number;
  
  // Print queue status
  pendingPrintJobs: number;
  printerConnected: boolean;
  
  // Storage status
  storageUsage: number;
  storageType: string;
  
  // Conflicts
  activeConflicts: number;
  
  // Performance metrics
  averageSyncTime: number;
  successRate: number;
}

export interface OfflinePOSConfig {
  enableAutoSync: boolean;
  syncInterval: number;
  maxRetryAttempts: number;
  batchSize: number;
  enablePrintQueue: boolean;
  enableConflictResolution: boolean;
  storageCleanupInterval: number;
}

export type OfflineStatusCallback = (status: OfflinePOSStatus) => void;

export class OfflinePOSManager {
  private static instance: OfflinePOSManager;
  
  // Core services
  private transactionQueue: EnhancedOfflineTransactionQueue;
  private networkService: EnhancedNetworkDetectionService;
  private syncManager: IntelligentSyncManager;
  private conflictResolver: ConflictResolutionSystem;
  private printQueueManager: EnhancedPrintQueueManager;
  
  // State management
  private isInitialized = false;
  private statusCallbacks: Set<OfflineStatusCallback> = new Set();
  private statusUpdateInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private config: OfflinePOSConfig = {
    enableAutoSync: true,
    syncInterval: 60000, // 1 minute
    maxRetryAttempts: 5,
    batchSize: 10,
    enablePrintQueue: true,
    enableConflictResolution: true,
    storageCleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  };

  private constructor() {
    this.transactionQueue = EnhancedOfflineTransactionQueue.getInstance();
    this.networkService = EnhancedNetworkDetectionService.getInstance();
    this.syncManager = IntelligentSyncManager.getInstance();
    this.conflictResolver = ConflictResolutionSystem.getInstance();
    this.printQueueManager = EnhancedPrintQueueManager.getInstance();
  }

  static getInstance(): OfflinePOSManager {
    if (!OfflinePOSManager.instance) {
      OfflinePOSManager.instance = new OfflinePOSManager();
    }
    return OfflinePOSManager.instance;
  }

  /**
   * Initialize the complete offline POS system
   */
  async initialize(config?: Partial<OfflinePOSConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Offline POS Manager already initialized');
      return;
    }

    console.log('🚀 Initializing Offline POS Manager...');

    try {
      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize core services in order
      console.log('📦 Initializing storage and transaction queue...');
      await this.transactionQueue.initialize();

      console.log('🌐 Initializing network detection...');
      await this.networkService.initialize();

      console.log('🔄 Initializing sync manager...');
      await this.syncManager.initialize();

      if (this.config.enablePrintQueue) {
        console.log('🖨️ Initializing print queue...');
        await this.printQueueManager.initialize();
      }

      // Set up service worker for web environments (production only)
      if (!Capacitor.isNativePlatform() && !import.meta.env.DEV) {
        await this.initializeServiceWorker();
      } else if (import.meta.env.DEV) {
        console.log('ℹ️ Service Worker disabled in development mode');
      }

      // Set up cross-service communication
      this.setupServiceCommunication();

      // Start monitoring and maintenance
      this.startStatusMonitoring();
      this.startPeriodicCleanup();

      this.isInitialized = true;
      
      console.log('✅ Offline POS Manager initialized successfully');
      
      // Show initialization success
      toast.success('Offline POS System Ready', {
        description: 'All offline features are now available'
      });

      // Trigger initial status update
      await this.updateStatus();

    } catch (error) {
      console.error('❌ Failed to initialize Offline POS Manager:', error);
      toast.error('Offline system initialization failed', {
        description: 'Some features may not work properly'
      });
      throw error;
    }
  }

  /**
   * Process an offline transaction
   */
  async processOfflineTransaction(transactionData: any): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Offline POS Manager not initialized');
    }

    try {
      console.log('💳 Processing offline transaction...');
      
      // Queue the transaction
      const transactionId = await this.transactionQueue.queueTransaction(transactionData);
      
      // Note: Print coordination is now handled by PrintCoordinator in CompletedTransaction
      // This prevents duplicate print attempts between offline queue and direct printing
      console.log('💳 [OFFLINE-POS] Transaction queued, printing handled by PrintCoordinator');

      // Trigger immediate sync if network conditions are good
      const networkStatus = this.networkService.getNetworkStatus();
      if (networkStatus.isOnline && networkStatus.stableConnection) {
        // Don't await - let it run in background
        this.syncManager.triggerSync('immediate').catch(error => {
          console.warn('Background sync failed:', error);
        });
      }

      return transactionId;
    } catch (error) {
      console.error('❌ Failed to process offline transaction:', error);
      throw error;
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(priority: 'immediate' | 'background' = 'immediate'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Offline POS Manager not initialized');
    }

    try {
      const result = await this.syncManager.triggerSync(priority);
      
      if (result.success) {
        toast.success(`Sync completed: ${result.syncedCount} transactions`, {
          description: `${result.failedCount} failed, ${result.conflictCount} conflicts`
        });
      } else {
        toast.error('Sync failed', {
          description: 'Will retry automatically'
        });
      }
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      toast.error('Sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current offline POS status
   */
  async getStatus(): Promise<OfflinePOSStatus> {
    if (!this.isInitialized) {
      return this.createEmptyStatus();
    }

    try {
      const networkStatus = this.networkService.getNetworkStatus();
      const queueStats = await this.transactionQueue.getQueueStats();
      const printStats = await this.printQueueManager.getQueueStats();
      const conflictStats = this.conflictResolver.getConflictStats();
      const syncStatus = this.syncManager.getSyncStatus();

      return {
        isInitialized: this.isInitialized,
        isOnline: networkStatus.isOnline,
        networkQuality: networkStatus.quality.level,
        
        pendingTransactions: queueStats.pendingTransactions,
        failedTransactions: queueStats.failedTransactions,
        syncingTransactions: queueStats.syncingTransactions,
        
        isSyncing: syncStatus.isSyncing,
        lastSyncTime: syncStatus.lastSyncTime,
        
        pendingPrintJobs: printStats.pendingJobs,
        printerConnected: this.printQueueManager.getPrinterStatus().isConnected,
        
        storageUsage: queueStats.storageUsage,
        storageType: 'enhanced', // This would be determined by the storage manager
        
        activeConflicts: conflictStats.pendingConflicts,
        
        averageSyncTime: queueStats.estimatedSyncTime,
        successRate: printStats.successRate
      };
    } catch (error) {
      console.error('❌ Failed to get status:', error);
      return this.createEmptyStatus();
    }
  }

  /**
   * Add status change listener
   */
  addStatusListener(callback: OfflineStatusCallback): void {
    this.statusCallbacks.add(callback);
  }

  /**
   * Remove status change listener
   */
  removeStatusListener(callback: OfflineStatusCallback): void {
    this.statusCallbacks.delete(callback);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<OfflinePOSConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): OfflinePOSConfig {
    return { ...this.config };
  }

  /**
   * Initialize service worker for web environments
   */
  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });

        // Wait for service worker to be active before registering background sync
        await this.waitForServiceWorkerActive(registration);

        // Register for background sync (only if supported and service worker is active)
        if ('sync' in registration && registration.active) {
          try {
            await (registration as any).sync.register('offline-transactions-sync');
            console.log('✅ Background sync registered');
          } catch (syncError) {
            console.warn('⚠️ Background sync not available:', syncError);
          }
        } else {
          console.log('ℹ️ Background sync not supported, will use manual sync');
        }

      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Wait for service worker to become active
   */
  private async waitForServiceWorkerActive(registration: ServiceWorkerRegistration): Promise<void> {
    // If already active, return immediately
    if (registration.active) {
      return;
    }

    // Wait for installing or waiting worker to become active
    const worker = registration.installing || registration.waiting;
    if (!worker) {
      return;
    }

    return new Promise((resolve) => {
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') {
          console.log('✅ Service Worker activated');
          resolve();
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        console.warn('⚠️ Service Worker activation timeout');
        resolve();
      }, 10000);
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(data: any): void {
    const { type, payload } = data;

    switch (type) {
      case 'BACKGROUND_SYNC_TRIGGERED':
        console.log('🔄 Background sync triggered by service worker');
        this.syncManager.triggerSync('background');
        break;
      
      case 'CACHE_STATUS_UPDATE':
        console.log('📦 Cache status updated:', payload);
        break;
      
      default:
        console.log('📨 Unknown service worker message:', data);
    }
  }

  /**
   * Set up communication between services
   */
  private setupServiceCommunication(): void {
    // Listen for network changes to trigger sync
    this.networkService.addListener((networkStatus) => {
      if (networkStatus.justReconnected && networkStatus.stableConnection) {
        console.log('🌐 Network reconnected, triggering sync...');
        this.syncManager.triggerSync('immediate');
      }
    });

    // Listen for sync progress updates
    this.syncManager.addProgressListener((progress) => {
      console.log('🔄 Sync progress:', progress);
      // Could update UI here
    });

    // Listen for print job updates
    this.printQueueManager.addJobCallback((job) => {
      console.log('🖨️ Print job update:', job.id, job.status);
    });

    console.log('🔗 Service communication established');
  }

  /**
   * Start status monitoring
   */
  private startStatusMonitoring(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }

    this.statusUpdateInterval = setInterval(async () => {
      await this.updateStatus();
    }, 30000); // Update every 30 seconds

    console.log('📊 Status monitoring started');
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, this.config.storageCleanupInterval);

    console.log('🧹 Periodic cleanup started');
  }

  /**
   * Update status and notify listeners
   */
  private async updateStatus(): Promise<void> {
    try {
      const status = await this.getStatus();
      this.notifyStatusListeners(status);
    } catch (error) {
      console.error('❌ Status update failed:', error);
    }
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(status: OfflinePOSStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('❌ Status callback failed:', error);
      }
    });
  }

  /**
   * Perform system cleanup
   */
  private async performCleanup(): Promise<void> {
    try {
      console.log('🧹 Performing system cleanup...');
      
      // Cleanup resolved conflicts
      this.conflictResolver.cleanupResolvedConflicts();
      
      // This would trigger cleanup in other services
      // await this.transactionQueue.cleanup();
      // await this.printQueueManager.cleanup();
      
      console.log('✅ System cleanup completed');
    } catch (error) {
      console.error('❌ System cleanup failed:', error);
    }
  }

  /**
   * Create empty status object
   */
  private createEmptyStatus(): OfflinePOSStatus {
    return {
      isInitialized: false,
      isOnline: false,
      networkQuality: 'offline',
      pendingTransactions: 0,
      failedTransactions: 0,
      syncingTransactions: 0,
      isSyncing: false,
      pendingPrintJobs: 0,
      printerConnected: false,
      storageUsage: 0,
      storageType: 'unknown',
      activeConflicts: 0,
      averageSyncTime: 0,
      successRate: 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.statusCallbacks.clear();
    
    // Cleanup individual services
    this.syncManager.destroy();
    this.printQueueManager.destroy();
    this.networkService.destroy();
    
    this.isInitialized = false;
    
    console.log('🧹 Offline POS Manager destroyed');
  }
}
