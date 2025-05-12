
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, RefreshCcw } from "lucide-react";
import { format } from "date-fns";
import { useStore } from "@/contexts/StoreContext";
import { useCamera } from "@/hooks/useCamera";
import TimestampOverlay from "./TimestampOverlay";
import CaptureButton from "./CaptureButton";
import PhotoPreview from "./PhotoPreview";

interface ShiftCameraProps {
  onCapture: (photoUrl: string | null) => void;
  onReset?: () => void;
}

export default function ShiftCamera({ onCapture, onReset }: ShiftCameraProps) {
  const { currentStore } = useStore();
  const initRef = useRef<boolean>(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [mountComplete, setMountComplete] = useState(false);
  
  const { 
    videoRef,
    canvasRef,
    showCamera,
    photo,
    setPhoto,
    startCamera,
    stopCamera,
    logVideoState,
    cameraError,
    cameraInitialized,
    isStartingCamera,
    capturePhoto
  } = useCamera();
  
  // Mark component as mounted after render
  useEffect(() => {
    setMountComplete(true);
  }, []);
  
  // Start camera after component is fully mounted
  useEffect(() => {
    if (mountComplete && !initRef.current) {
      initRef.current = true;
      
      // Short delay to ensure DOM is ready
      setTimeout(() => {
        initCamera();
      }, 300);
    }
    
    // Clean up on unmount
    return () => {
      stopCamera();
    };
  }, [mountComplete, stopCamera]);

  const initCamera = () => {
    logVideoState(); // Log before starting
    startCamera();
    // Log video state after starting for debugging
    setTimeout(() => {
      logVideoState();
    }, 500);
  };
  
  const handleCaptureClick = () => {
    const photoUrl = capturePhoto();
    if (photoUrl) {
      onCapture(photoUrl);
    }
  };
  
  const resetPhoto = () => {
    setPhoto(null);
    onCapture(null);
    initCamera();
    if (onReset) {
      onReset();
    }
  };
  
  const handleRetry = () => {
    logVideoState();
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 300);
  };
  
  return (
    <div className="space-y-2">
      <Label>Capture Photo</Label>
      
      <div 
        ref={videoContainerRef}
        className="w-full h-48 bg-black rounded-md relative overflow-hidden"
      >
        {showCamera ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
              onClick={() => logVideoState()}
            />
            {cameraInitialized ? (
              <>
                <TimestampOverlay storeName={currentStore?.name} />
                <CaptureButton onClick={handleCaptureClick} />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-white mx-auto mb-2" />
                  <p>Initializing camera...</p>
                </div>
              </div>
            )}
          </>
        ) : photo ? (
          <PhotoPreview photoUrl={photo} onReset={resetPhoto} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            {isStartingCamera ? (
              <div className="text-center">
                <div className="animate-spin h-8 w-8 rounded-full border-t-2 border-primary mx-auto mb-2" />
                <p className="text-sm">Initializing camera...</p>
              </div>
            ) : (
              <Button 
                onClick={initCamera} 
                variant="outline"
                className="mb-2"
                disabled={isStartingCamera}
              >
                <Camera className="mr-2 h-4 w-4" />
                Enable Camera
              </Button>
            )}
            
            {cameraError && (
              <div className="text-xs text-red-500 text-center px-4 mt-2 max-w-[90%]">
                <p className="mb-1">{cameraError}</p>
                <div className="flex gap-2 justify-center mt-1">
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-xs p-0 h-auto flex items-center" 
                    onClick={() => logVideoState()}
                  >
                    <span>Check status</span>
                  </Button>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-xs p-0 h-auto flex items-center" 
                    onClick={handleRetry}
                    disabled={isStartingCamera}
                  >
                    <RefreshCcw className="mr-1 h-3 w-3" />
                    <span>Retry</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
