import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, Loader2 } from 'lucide-react';

interface RecipeImageDisplayProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  loadingClassName?: string;
  showLoadingState?: boolean;
  onError?: () => void;
  onLoad?: () => void;
}

export const RecipeImageDisplay: React.FC<RecipeImageDisplayProps> = ({
  src,
  alt,
  className,
  fallbackClassName,
  loadingClassName,
  showLoadingState = true,
  onError,
  onLoad
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError || !src) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-lg",
        fallbackClassName || className
      )}>
        <div className="text-center p-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {hasError ? 'Failed to load image' : 'No image available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && showLoadingState && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-muted rounded-lg z-10",
          loadingClassName
        )}>
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading image...</p>
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-200",
          isLoading && "opacity-0",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

export default RecipeImageDisplay;