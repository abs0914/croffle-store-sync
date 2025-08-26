import { useState, useEffect, useCallback } from 'react';
import { unifiedProductService, ProductSyncResult } from '@/services/productManagement/unifiedProductService';
import { syncMonitoringService, SyncReport, AutoSyncConfig } from '@/services/productManagement/syncMonitoringService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductSyncHookResult {
  syncStatus: 'idle' | 'syncing' | 'monitoring';
  syncReport: SyncReport | null;
  updateProduct: (storeId: string, recipeId: string, updates: any) => Promise<ProductSyncResult>;
  repairSync: (storeId: string, recipeId?: string) => Promise<ProductSyncResult>;
  generateReport: (storeId: string) => Promise<void>;
  enableAutoSync: (config: AutoSyncConfig) => void;
  disableAutoSync: () => void;
}

export const useProductSync = (storeId?: string): ProductSyncHookResult => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'monitoring'>('idle');
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [autoSyncCleanup, setAutoSyncCleanup] = useState<(() => void) | null>(null);

  // Update product with sync validation
  const updateProduct = useCallback(async (
    targetStoreId: string, 
    recipeId: string, 
    updates: any
  ): Promise<ProductSyncResult> => {
    setSyncStatus('syncing');
    
    try {
      const result = await unifiedProductService.updateProduct(targetStoreId, recipeId, updates);
      
      // Validate sync after update
      if (result.success) {
        const validation = await unifiedProductService.validateSync(targetStoreId, recipeId);
        if (!validation.isInSync) {
          toast.warning('Product updated but sync issues detected');
          // Auto-repair if needed
          await unifiedProductService.repairSync(targetStoreId, recipeId);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Product update failed:', error);
      return {
        success: false,
        message: 'Product update failed',
        affectedTables: [],
        conflicts: [error instanceof Error ? error.message : 'Unknown error']
      };
    } finally {
      setSyncStatus('idle');
    }
  }, []);

  // Repair sync issues
  const repairSync = useCallback(async (
    targetStoreId: string, 
    recipeId?: string
  ): Promise<ProductSyncResult> => {
    setSyncStatus('syncing');
    
    try {
      const result = await unifiedProductService.repairSync(targetStoreId, recipeId);
      
      // Refresh report after repair
      if (result.success && storeId === targetStoreId) {
        await generateReport(targetStoreId);
      }
      
      return result;
    } finally {
      setSyncStatus('idle');
    }
  }, [storeId]);

  // Generate sync report
  const generateReport = useCallback(async (targetStoreId: string) => {
    setSyncStatus('monitoring');
    
    try {
      const report = await syncMonitoringService.generateSyncReport(targetStoreId);
      setSyncReport(report);
      
      if (report.syncIssues > 0) {
        toast.info(`Found ${report.syncIssues} sync issues in ${report.storeName}`);
      }
    } catch (error) {
      console.error('Failed to generate sync report:', error);
      toast.error('Failed to generate sync report');
    } finally {
      setSyncStatus('idle');
    }
  }, []);

  // Enable auto-sync monitoring
  const enableAutoSync = useCallback((config: AutoSyncConfig) => {
    // Disable existing auto-sync first
    if (autoSyncCleanup) {
      autoSyncCleanup();
    }
    
    const cleanup = syncMonitoringService.schedulePeriodicValidation(config);
    setAutoSyncCleanup(() => cleanup);
    setSyncStatus('monitoring');
    
    toast.success(`Auto-sync enabled (every ${config.intervalMinutes} minutes)`);
  }, [autoSyncCleanup]);

  // Disable auto-sync monitoring
  const disableAutoSync = useCallback(() => {
    if (autoSyncCleanup) {
      autoSyncCleanup();
      setAutoSyncCleanup(null);
    }
    setSyncStatus('idle');
    toast.info('Auto-sync disabled');
  }, [autoSyncCleanup]);

  // Set up real-time listeners for changes
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('product-sync-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          console.log('Recipe changed:', payload);
          
          // Regenerate report after a short delay to allow triggers to execute
          setTimeout(async () => {
            await generateReport(storeId);
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_catalog',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          console.log('Product catalog changed:', payload);
          
          // Regenerate report after a short delay
          setTimeout(async () => {
            await generateReport(storeId);
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, generateReport]);

  // Generate initial report when storeId changes
  useEffect(() => {
    if (storeId) {
      generateReport(storeId);
    }
  }, [storeId, generateReport]);

  // Cleanup auto-sync on unmount
  useEffect(() => {
    return () => {
      if (autoSyncCleanup) {
        autoSyncCleanup();
      }
    };
  }, [autoSyncCleanup]);

  return {
    syncStatus,
    syncReport,
    updateProduct,
    repairSync,
    generateReport,
    enableAutoSync,
    disableAutoSync
  };
};