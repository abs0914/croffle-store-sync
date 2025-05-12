
import { useEffect, useRef } from "react";
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
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
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
    cameraInitialized
  } = useCamera();
  
  // Start camera automatically when component mounts
  useEffect(() => {
    // Only try to initialize camera once
    if (!initRef.current) {
      initRef.current = true;
      
      // Add a small delay before initializing camera
      // This helps ensure the video element is properly mounted in the DOM
      initTimerRef.current = setTimeout(() => {
        initCamera();
      }, 500);
    }
    
    // Clean up on unmount
    return () => {
      stopCamera();
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
      }
    };
  }, [stopCamera]);

  const initCamera = async () => {
    logVideoState(); // Log before starting
    await startCamera();
    // Log video state after starting for debugging
    setTimeout(() => {
      logVideoState();
    }, 500);
  };
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw timestamp on the photo
        const now = new Date();
        const timestamp = format(now, "yyyy-MM-dd HH:mm:ss");
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(timestamp, canvas.width - 10, canvas.height - 10);
        if (currentStore) {
          ctx.textAlign = 'left';
          ctx.fillText(currentStore.name, 10, canvas.height - 10);
        }
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    } else {
      console.error("Video not ready yet:", videoRef.current?.readyState);
      logVideoState();
    }
  };
  
  const resetPhoto = () => {
    setPhoto(null);
    onCapture(null);
    startCamera();
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
                <CaptureButton onClick={capturePhoto} />
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
            <Button 
              onClick={startCamera} 
              variant="outline"
              className="mb-2"
            >
              <Camera className="mr-2 h-4 w-4" />
              Enable Camera
            </Button>
            
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
