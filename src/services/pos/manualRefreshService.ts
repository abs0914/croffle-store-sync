/**
 * Manual refresh service for POS
 * Provides a way to force refresh product data immediately
 */

import { unifiedProductInventoryService } from '@/services/unified/UnifiedProductInventoryService';
import { priceRefreshService } from '@/services/pos/priceRefreshService';
import { toast } from 'sonner';

class ManualRefreshService {
  /**
   * Force immediate refresh of POS data
   */
  async forceRefresh(storeId: string): Promise<void> {
    try {
      console.log('🔄 Force refreshing POS data for store:', storeId);
      
      // Clear all caches
      const cachedData = unifiedProductInventoryService.getCachedData(storeId);
      if (cachedData) {
        console.log('🗑️ Clearing cached data');
      }
      
      // Force fresh fetch
      await unifiedProductInventoryService.getUnifiedData(storeId);
      
      // Trigger price refresh listeners
      priceRefreshService.triggerRefresh();
      
      toast.success('Product data refreshed successfully');
      console.log('✅ Force refresh completed');
      
    } catch (error) {
      console.error('❌ Error during force refresh:', error);
      toast.error('Failed to refresh product data');
      throw error;
    }
  }
  
  /**
   * Check if data is fresh (less than 30 seconds old)
   */
  isDataFresh(storeId: string): boolean {
    const cached = unifiedProductInventoryService.getCachedData(storeId);
    if (!cached) return false;
    
    const lastSync = new Date(cached.lastSync);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    
    return diffMs < 30000; // 30 seconds
  }
}

export const manualRefreshService = new ManualRefreshService();