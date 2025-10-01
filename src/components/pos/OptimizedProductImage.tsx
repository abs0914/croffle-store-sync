import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';
import { imagePreloadService } from '@/services/imagePreloadService';

interface OptimizedProductImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
  onError?: () => void;
}

/**
 * Optimized product image component with progressive loading
 * - Shows instant placeholder for better perceived performance
 * - Uses browser cache without cache-busting
 * - Integrates with image preload service
 */
export const OptimizedProductImage: React.FC<OptimizedProductImageProps> = ({
  src,
  alt,
  className,
  priority = 'medium',
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      return;
    }

    // Check if image is already preloaded
    if (imagePreloadService.isPreloaded(src)) {
      setShowImage(true);
      setIsLoaded(true);
      return;
    }

    // Show image immediately, let browser cache handle it
    setShowImage(true);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoaded(false);
    setHasError(true);
    onError?.();
  };

  if (hasError || !src) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted",
        className
      )}>
        <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {/* Skeleton loader */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      
      {/* Actual image */}
      {showImage && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority === 'high' ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </div>
  );
};
