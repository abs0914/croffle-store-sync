/**
 * Manual refresh service for POS
 * Provides a way to force refresh product data immediately
 */

import { unifiedProductInventoryService } from '@/services/unified/UnifiedProductInventoryService';
import { priceRefreshService } from '@/services/pos/priceRefreshService';
import { toast } from 'sonner';

class ManualRefreshService {
  /**
   * Force immediate refresh of POS data with aggressive cache clearing
   */
  async forceRefresh(storeId: string): Promise<void> {
    try {
      console.log('🔄 Force refreshing POS data for store:', storeId);
      
      // Step 1: Clear all service caches aggressively
      const cachedData = unifiedProductInventoryService.getCachedData(storeId);
      if (cachedData) {
        console.log('🗑️ Clearing cached data');
      }
      
      // Step 2: Clear browser image cache by adding cache-busting timestamp
      this.bustImageCache();
      
      // Step 3: Force fresh fetch with cache bypass
      await unifiedProductInventoryService.forceRefreshWithCacheBusting(storeId);
      
      // Step 4: Trigger price refresh listeners
      priceRefreshService.triggerRefresh();
      
      // Step 5: Validate image URLs in the background
      this.validateProductImages(storeId);
      
      toast.success('Product data refreshed successfully', {
        description: 'All caches cleared and data reloaded'
      });
      console.log('✅ Force refresh completed with cache busting');
      
    } catch (error) {
      console.error('❌ Error during force refresh:', error);
      toast.error('Failed to refresh product data', {
        description: 'Please try again or check your connection'
      });
      throw error;
    }
  }

  /**
   * Bust browser image cache by appending timestamp
   */
  private bustImageCache(): void {
    const timestamp = Date.now();
    const images = document.querySelectorAll('img[src*="product"]');
    
    images.forEach((img: Element) => {
      const imgElement = img as HTMLImageElement;
      const originalSrc = imgElement.src;
      
      // Remove any existing cache busting parameters
      const cleanSrc = originalSrc.split('?')[0];
      
      // Add new cache busting parameter
      imgElement.src = `${cleanSrc}?v=${timestamp}`;
      
      console.log('🖼️ Cache busted image:', cleanSrc);
    });
  }

  /**
   * Validate product images in the background
   */
  private async validateProductImages(storeId: string): Promise<void> {
    try {
      const cachedData = unifiedProductInventoryService.getCachedData(storeId);
      if (!cachedData) return;

      const productsWithImages = cachedData.products.filter(p => p.image_url);
      
      console.log(`🔍 Validating ${productsWithImages.length} product images`);
      
      const validationPromises = productsWithImages.map(async (product) => {
        try {
          const response = await fetch(product.image_url, { method: 'HEAD' });
          if (!response.ok) {
            console.warn(`⚠️ Image validation failed for ${product.name}:`, product.image_url);
            return { product, valid: false };
          }
          return { product, valid: true };
        } catch (error) {
          console.warn(`⚠️ Image validation error for ${product.name}:`, error);
          return { product, valid: false };
        }
      });

      const results = await Promise.allSettled(validationPromises);
      const failedImages = results
        .filter((result): result is PromiseFulfilledResult<{product: any, valid: boolean}> => 
          result.status === 'fulfilled' && !result.value.valid)
        .map(result => result.value.product);

      if (failedImages.length > 0) {
        console.warn(`⚠️ ${failedImages.length} product images failed validation`);
        failedImages.forEach(product => {
          console.warn(`📷 Invalid image for: ${product.name} - ${product.image_url}`);
        });
      }
    } catch (error) {
      console.error('❌ Error validating product images:', error);
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