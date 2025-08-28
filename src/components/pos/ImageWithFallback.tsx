import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onError?: () => void;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  onError
}) => {
  const [hasError, setHasError] = useState(false);

  const handleImageError = () => {
    console.warn(`🖼️ Image load failed: ${src}`);
    setHasError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    setHasError(false);
  };

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

  // Add cache-busting timestamp to force fresh image loads
  const cacheBustedSrc = src.includes('?') 
    ? `${src}&cb=${Date.now()}` 
    : `${src}?cb=${Date.now()}`;

  return (
    <img
      src={cacheBustedSrc}
      alt={alt}
      className={className}
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
    />
  );
};