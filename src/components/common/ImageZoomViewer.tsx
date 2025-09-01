import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageZoomViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ImageZoomViewer: React.FC<ImageZoomViewerProps> = ({
  src,
  alt,
  isOpen,
  onClose,
  className
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan when image changes
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(100);
      setPanPosition({ x: 0, y: 0 });
      setIsFullscreen(false);
    }
  }, [src, isOpen]);

  const handleZoomChange = useCallback((value: number[]) => {
    const newZoom = value[0];
    setZoomLevel(newZoom);
    
    // Reset pan when zooming out to fit
    if (newZoom <= 100) {
      setPanPosition({ x: 0, y: 0 });
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 500));
  }, []);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoomLevel - 25, 25);
    setZoomLevel(newZoom);
    
    // Reset pan when zooming out to fit
    if (newZoom <= 100) {
      setPanPosition({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  const handleReset = useCallback(() => {
    setZoomLevel(100);
    setPanPosition({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const img = imageRef.current;
    
    // Calculate the zoom level needed to fit the image in the container
    const scaleX = (containerRect.width - 40) / img.naturalWidth;
    const scaleY = (containerRect.height - 100) / img.naturalHeight;
    const scale = Math.min(scaleX, scaleY, 1) * 100;
    
    setZoomLevel(Math.max(scale, 25));
    setPanPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel > 100) {
      setIsDragging(true);
      setLastMousePosition({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, [zoomLevel]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 100) {
      const deltaX = e.clientX - lastMousePosition.x;
      const deltaY = e.clientY - lastMousePosition.y;
      
      setPanPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePosition({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastMousePosition, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setZoomLevel(prev => Math.max(25, Math.min(500, prev + delta)));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const imageStyle: React.CSSProperties = {
    transform: `scale(${zoomLevel / 100}) translate(${panPosition.x / (zoomLevel / 100)}px, ${panPosition.y / (zoomLevel / 100)}px)`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.2s ease-out',
    cursor: zoomLevel > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default',
    maxWidth: 'none',
    maxHeight: 'none',
    width: 'auto',
    height: 'auto'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden",
        isFullscreen && "max-w-none w-full h-full",
        className
      )}>
        <DialogHeader className="p-4 pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-medium truncate">{alt}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 25}
              className="h-8 px-2"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            
            <div className="flex-1 px-2">
              <Slider
                value={[zoomLevel]}
                onValueChange={handleZoomChange}
                min={25}
                max={500}
                step={5}
                className="w-full"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 500}
              className="h-8 px-2"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            
            <span className="text-xs font-mono w-12 text-center">
              {Math.round(zoomLevel)}%
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToScreen}
              className="h-8 px-3 text-xs"
            >
              Fit
            </Button>
          </div>
        </DialogHeader>
        
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden bg-gray-50 relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <div className="w-full h-full flex items-center justify-center">
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              style={imageStyle}
              className="select-none"
              draggable={false}
              onLoad={handleFitToScreen}
            />
          </div>
          
          {/* Pan indicator */}
          {zoomLevel > 100 && (
            <div className="absolute bottom-4 right-4 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow">
              {isDragging ? 'Dragging...' : 'Click and drag to pan'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};