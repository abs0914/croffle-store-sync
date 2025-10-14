import React, { useState } from 'react';
import { AlertCircle, ZoomIn } from 'lucide-react';
import { ImageZoomViewer } from '../common/ImageZoomViewer';
import { useImageZoom } from '@/hooks/useImageZoom';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onError?: () => void;
  enableZoom?: boolean;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  onError,
  enableZoom = false
}) => {
  const [hasError, setHasError] = useState(false);
  const { selectedImage, isZoomViewerOpen, openImageZoom, closeImageZoom } = useImageZoom();

  const handleImageError = () => {
    console.warn(`🖼️ Image load failed: ${src}`);
    setHasError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    setHasError(false);
  };

  const handleImageClick = () => {
    if (enableZoom && !hasError) {
      openImageZoom(src, alt);
    }
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

  return (
    <>
      <div className={`relative group ${enableZoom ? 'cursor-pointer' : ''}`}>
        <img
          src={src}
          alt={alt}
          className={className}
          onError={handleImageError}
          onLoad={handleImageLoad}
          onClick={handleImageClick}
          loading="lazy"
        />
        
        {/* Zoom overlay icon */}
        {enableZoom && !hasError && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white bg-opacity-90 rounded-full p-2 transform scale-75 group-hover:scale-100 transition-transform duration-200">
              <ZoomIn className="w-4 h-4 text-gray-700" />
            </div>
          </div>
        )}
      </div>
      
      {/* Zoom Viewer Modal */}
      {enableZoom && selectedImage && (
        <ImageZoomViewer
          src={selectedImage.src}
          alt={selectedImage.alt}
          isOpen={isZoomViewerOpen}
          onClose={closeImageZoom}
        />
      )}
    </>
  );
};