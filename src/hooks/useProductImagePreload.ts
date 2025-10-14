/**
 * Hook for preloading product images in POS
 */

import { useEffect } from 'react';
import { imagePreloadService } from '@/services/imagePreloadService';
import { Product } from '@/types/product';

interface UseProductImagePreloadOptions {
  enabled?: boolean;
  preloadAll?: boolean;
}

/**
 * Preload product images based on current view
 */
export function useProductImagePreload(
  products: Product[],
  filteredProducts: Product[],
  options: UseProductImagePreloadOptions = {}
) {
  const { enabled = true, preloadAll = false } = options;

  useEffect(() => {
    if (!enabled || filteredProducts.length === 0) return;

    // Extract image URLs from filtered products (visible)
    const visibleImageUrls = filteredProducts
      .map(p => p.image_url)
      .filter((url): url is string => !!url)
      .slice(0, 20); // Preload first 20 visible products immediately

    // Preload visible images with high priority
    if (visibleImageUrls.length > 0) {
      imagePreloadService.preloadVisibleImages(visibleImageUrls);
    }

    // Preload remaining filtered products with medium priority
    const remainingImageUrls = filteredProducts
      .slice(20)
      .map(p => p.image_url)
      .filter((url): url is string => !!url);

    if (remainingImageUrls.length > 0) {
      setTimeout(() => {
        imagePreloadService.preloadCategoryImages(remainingImageUrls);
      }, 500); // Delay slightly to prioritize visible images
    }

    // Optionally preload all product images in background
    if (preloadAll && products.length > filteredProducts.length) {
      const allImageUrls = products
        .map(p => p.image_url)
        .filter((url): url is string => !!url);

      setTimeout(() => {
        imagePreloadService.preloadAllImages(allImageUrls);
      }, 2000); // Low priority background preload
    }
  }, [products, filteredProducts, enabled, preloadAll]);
}
