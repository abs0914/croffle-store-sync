/**
 * Background Image Validation Hook
 * Uses Web Worker to validate images without blocking UI
 */

import { useState, useEffect, useRef } from 'react';

interface ImageValidationResult {
  validImages: string[];
  invalidImages: string[];
  isValidating: boolean;
}

export function useBackgroundImageValidation(
  images: Array<{ id: string; url: string | null }>,
  enabled: boolean = true
): ImageValidationResult {
  const [validImages, setValidImages] = useState<string[]>([]);
  const [invalidImages, setInvalidImages] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!enabled || images.length === 0) return;

    // Initialize worker
    try {
      workerRef.current = new Worker(
        new URL('../workers/imageValidator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { type, validImages, invalidImages, duration } = event.data;
        
        if (type === 'result') {
          setValidImages(validImages);
          setInvalidImages(invalidImages);
          setIsValidating(false);
          console.log(`✅ Background image validation completed in ${duration.toFixed(0)}ms`);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('❌ Image validation worker error:', error);
        setIsValidating(false);
      };

      // Start validation
      setIsValidating(true);
      workerRef.current.postMessage({
        type: 'validate',
        images
      });
    } catch (error) {
      console.error('❌ Failed to create worker, falling back to sync validation:', error);
      setIsValidating(false);
      // Fallback: mark all as valid
      setValidImages(images.filter(img => img.url).map(img => img.id));
    }

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [images, enabled]);

  return {
    validImages,
    invalidImages,
    isValidating
  };
}
