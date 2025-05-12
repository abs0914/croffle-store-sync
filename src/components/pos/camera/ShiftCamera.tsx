
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
  const [initialized, setInitialized] = useState(false);
  const initAttemptRef = useRef(0);
  
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
    setCameraError,
    cameraInitialized,
    isStartingCamera,
    capturePhoto
  } = useCamera();
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
      setInitialized(false);
      initAttemptRef.current = 0;
    };
  }, [stopCamera]);
  
  // Try to initialize the camera with a polling approach
  useEffect(() => {
    // Only attempt initialization once
    if (initialized || isStartingCamera) return;
    
    const pollForVideoElement = () => {
      // Max retry count to avoid infinite loops
      if (initAttemptRef.current >= 10) {
        setCameraError("Failed to initialize camera after multiple attempts");
        return;
      }
      
      initAttemptRef.current++;
      console.log(`[Camera] Polling attempt ${initAttemptRef.current} for video element`);
      
      if (videoRef.current) {
        console.log("[Camera] Video element found, initializing camera");
        initCamera();
      } else {
        // Try again after a delay
        setTimeout(pollForVideoElement, 300);
      }
    };
    
    // Start the polling process
    setInitialized(true);
    setTimeout(pollForVideoElement, 500);
    
    // Clean up function
    return () => {
      initAttemptRef.current = 0;
    };
  }, [videoRef, isStartingCamera, initialized, startCamera, setCameraError]);

  const initCamera = async () => {
    try {
      console.log("[Camera] Starting camera with video element:", !!videoRef.current);
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }
      
      await startCamera();
      console.log("[Camera] Camera started successfully");
    } catch (error: any) {
      console.error("[Camera] Initialization error:", error);
      toast.error("Failed to access camera: " + error.message);
      setCameraError(error.message || "Camera initialization failed");
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
    setInitialized(false);
    initAttemptRef.current = 0;
    if (onReset) {
      onReset();
    }
  };
  
  const handleRetry = () => {
    stopCamera();
    setInitialized(false);
    initAttemptRef.current = 0;
    setCameraError(null);
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
        initCamera={() => { setInitialized(false); initAttemptRef.current = 0; }}
        handleRetry={handleRetry}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
