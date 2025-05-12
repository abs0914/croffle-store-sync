
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { useCamera } from "@/hooks/camera";  
import CameraContainer from "./CameraContainer";
import { toast } from "sonner";

interface ShiftCameraProps {
  onCapture: (photoUrl: string | null) => void;
  onReset?: () => void;
}

export default function ShiftCamera({ onCapture, onReset }: ShiftCameraProps) {
  const initRef = useRef<boolean>(false);
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
    // Set mount complete on next tick to ensure DOM is ready
    const timer = setTimeout(() => {
      setMountComplete(true);
    }, 100);
    
    // Clean up on unmount
    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [stopCamera]);
  
  // Start camera after component is fully mounted
  useEffect(() => {
    if (mountComplete && !initRef.current) {
      initRef.current = true;
      
      // Delay camera initialization to ensure DOM is fully ready
      setTimeout(() => {
        initCamera();
      }, 500);
    }
  }, [mountComplete]);

  const initCamera = async () => {
    try {
      console.log("Initializing camera, video element exists:", videoRef.current !== null);
      logVideoState(); // Log before starting
      
      await startCamera();
      
      // Log video state after starting for debugging
      setTimeout(() => {
        logVideoState();
      }, 500);
    } catch (error: any) {
      console.error("Camera init error:", error);
      toast.error("Failed to start camera: " + error.message);
    }
  };
  
  const handleCaptureClick = () => {
    const photoUrl = capturePhoto();
    if (photoUrl) {
      onCapture(photoUrl);
    } else {
      toast.error("Failed to capture photo");
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
      initCamera();
    }, 500);
  };
  
  return (
    <div className="space-y-2">
      <Label>Capture Photo</Label>
      
      <CameraContainer 
        videoRef={videoRef}
        showCamera={showCamera}
        photo={photo}
        cameraInitialized={cameraInitialized}
        isStartingCamera={isStartingCamera}
        cameraError={cameraError}
        logVideoState={logVideoState}
        handleCaptureClick={handleCaptureClick}
        resetPhoto={resetPhoto}
        initCamera={initCamera}
        handleRetry={handleRetry}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
