import { useState, useCallback } from 'react';

export interface UseImageZoomProps {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
}

export const useImageZoom = ({
  initialZoom = 100,
  minZoom = 25,
  maxZoom = 500,
  zoomStep = 25
}: UseImageZoomProps = {}) => {
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isZoomViewerOpen, setIsZoomViewerOpen] = useState(false);

  const openImageZoom = useCallback((src: string, alt: string) => {
    setSelectedImage({ src, alt });
    setIsZoomViewerOpen(true);
  }, []);

  const closeImageZoom = useCallback(() => {
    setIsZoomViewerOpen(false);
    setSelectedImage(null);
    setZoomLevel(initialZoom);
  }, [initialZoom]);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + zoomStep, maxZoom));
  }, [zoomStep, maxZoom]);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - zoomStep, minZoom));
  }, [zoomStep, minZoom]);

  const resetZoom = useCallback(() => {
    setZoomLevel(initialZoom);
  }, [initialZoom]);

  const setZoom = useCallback((zoom: number) => {
    setZoomLevel(Math.max(minZoom, Math.min(maxZoom, zoom)));
  }, [minZoom, maxZoom]);

  return {
    // State
    zoomLevel,
    selectedImage,
    isZoomViewerOpen,
    
    // Actions
    openImageZoom,
    closeImageZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    
    // Computed
    canZoomIn: zoomLevel < maxZoom,
    canZoomOut: zoomLevel > minZoom,
    isZoomed: zoomLevel !== initialZoom
  };
};