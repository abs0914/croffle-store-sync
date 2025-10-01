/**
 * Hook for preloading images with priority-based loading
 */

import { useEffect, useRef } from 'react';
import { imagePreloadService } from '@/services/imagePreloadService';

interface UseImagePreloadOptions {
  enabled?: boolean;
  priority?: number;
}

/**
 * Hook to preload images when component mounts or dependencies change
 */
export function useImagePreload(
  imageUrls: string[],
  options: UseImagePreloadOptions = {}
) {
  const { enabled = true, priority = 5 } = options;
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    // Filter out already preloaded images
    const urlsToPreload = imageUrls.filter(
      url => url && !preloadedRef.current.has(url)
    );

    if (urlsToPreload.length === 0) return;

    // Mark as preloading
    urlsToPreload.forEach(url => preloadedRef.current.add(url));

    // Preload images
    imagePreloadService.preloadBatch(urlsToPreload, priority);
  }, [imageUrls, enabled, priority]);
}

/**
 * Hook to preload images when they enter viewport
 */
export function useImagePreloadOnView(
  imageUrls: string[],
  containerRef: React.RefObject<HTMLElement>,
  options: UseImagePreloadOptions = {}
) {
  const { enabled = true, priority = 8 } = options;

  useEffect(() => {
    if (!enabled || !containerRef.current || imageUrls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preload images when container becomes visible
            imagePreloadService.preloadBatch(imageUrls, priority);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start preloading 50px before entering viewport
        threshold: 0.1
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [imageUrls, containerRef, enabled, priority]);
}
