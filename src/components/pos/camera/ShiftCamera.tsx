
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CameraOff } from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useCamera } from "@/hooks/camera";  // Updated import path
import CameraContainer from "./CameraContainer";

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
