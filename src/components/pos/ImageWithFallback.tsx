import React, { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onError?: () => void;
  retryCount?: number;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  onError,
  retryCount = 2
}) => {
  const [hasError, setHasError] = useState(false);
  const [retries, setRetries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = useCallback(() => {
    console.warn(`🖼️ Image load failed: ${src} (attempt ${retries + 1}/${retryCount + 1})`);
    
    if (retries < retryCount) {
      // Try to reload the image with cache busting
      const img = new Image();
      img.onload = () => {
        setRetries(prev => prev + 1);
        setHasError(false);
        setIsLoading(false);
      };
      img.onerror = () => {
        setRetries(prev => prev + 1);
        if (retries + 1 >= retryCount) {
          setHasError(true);
          setIsLoading(false);
          onError?.();
        }
      };
      img.src = `${src}?retry=${retries + 1}&t=${Date.now()}`;
    } else {
      setHasError(true);
      setIsLoading(false);
      onError?.();
    }
  }, [src, retries, retryCount, onError]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${fallbackClassName || className}`}>
        <div className="text-muted-foreground text-center">
          <AlertCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <span className="text-xs opacity-70">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-muted animate-pulse ${className}`}>
          <div className="text-muted-foreground text-xs">Loading...</div>
        </div>
      )}
      <img
        src={retries > 0 ? `${src}?retry=${retries}&t=${Date.now()}` : src}
        alt={alt}
        className={className}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </>
  );
};