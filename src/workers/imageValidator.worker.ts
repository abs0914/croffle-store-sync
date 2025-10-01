/**
 * Web Worker for image validation
 * Runs image validation in background to prevent blocking UI
 */

interface ImageValidationMessage {
  type: 'validate';
  images: Array<{ id: string; url: string | null }>;
}

interface ImageValidationResult {
  type: 'result';
  validImages: string[];
  invalidImages: string[];
  duration: number;
}

self.onmessage = async (event: MessageEvent<ImageValidationMessage>) => {
  const { type, images } = event.data;
  
  if (type === 'validate') {
    const startTime = performance.now();
    const validImages: string[] = [];
    const invalidImages: string[] = [];
    
    // Validate images in parallel batches
    const batchSize = 10;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async ({ id, url }) => {
          if (!url) {
            invalidImages.push(id);
            return;
          }
          
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              validImages.push(id);
            } else {
              invalidImages.push(id);
            }
          } catch {
            invalidImages.push(id);
          }
        })
      );
    }
    
    const duration = performance.now() - startTime;
    
    const result: ImageValidationResult = {
      type: 'result',
      validImages,
      invalidImages,
      duration
    };
    
    self.postMessage(result);
  }
};

export {};
