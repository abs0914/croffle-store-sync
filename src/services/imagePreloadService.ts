/**
 * Image Preload Service
 * Efficiently preloads product images to improve perceived performance
 */

interface PreloadTask {
  url: string;
  priority: number;
}

class ImagePreloadService {
  private preloadedImages: Set<string> = new Set();
  private preloadQueue: PreloadTask[] = [];
  private isProcessing: boolean = false;
  private maxConcurrent: number = 6; // Browser typically allows 6 concurrent requests per domain

  /**
   * Preload a single image
   */
  preloadImage(url: string, priority: number = 5): Promise<void> {
    if (!url || this.preloadedImages.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.preloadedImages.add(url);
        console.log(`✅ Preloaded image: ${url}`);
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`⚠️ Failed to preload image: ${url}`);
        reject(new Error(`Failed to preload: ${url}`));
      };
      
      img.src = url;
    });
  }

  /**
   * Batch preload multiple images with priority
   */
  async preloadBatch(urls: string[], priority: number = 5): Promise<void> {
    const validUrls = urls.filter(url => url && !this.preloadedImages.has(url));
    
    if (validUrls.length === 0) {
      return;
    }

    console.log(`🔄 Preloading ${validUrls.length} images with priority ${priority}`);
    
    // Process in batches to respect browser concurrency limits
    const batches: string[][] = [];
    for (let i = 0; i < validUrls.length; i += this.maxConcurrent) {
      batches.push(validUrls.slice(i, i + this.maxConcurrent));
    }

    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(url => this.preloadImage(url, priority))
      );
    }
  }

  /**
   * Preload images that are visible in viewport
   */
  preloadVisibleImages(imageUrls: string[]): void {
    this.preloadBatch(imageUrls, 10); // High priority for visible images
  }

  /**
   * Preload images for a specific category
   */
  preloadCategoryImages(categoryImageUrls: string[]): void {
    this.preloadBatch(categoryImageUrls, 7); // Medium-high priority
  }

  /**
   * Preload all product images (low priority, background)
   */
  preloadAllImages(allImageUrls: string[]): void {
    this.preloadBatch(allImageUrls, 3); // Low priority for background preload
  }

  /**
   * Check if an image is already preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedImages.has(url);
  }

  /**
   * Clear preload cache
   */
  clearCache(): void {
    this.preloadedImages.clear();
    console.log('🗑️ Image preload cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      preloadedCount: this.preloadedImages.size,
      preloadedUrls: Array.from(this.preloadedImages)
    };
  }
}

// Export singleton instance
export const imagePreloadService = new ImagePreloadService();
