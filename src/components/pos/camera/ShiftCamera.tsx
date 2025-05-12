
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
  const initTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
    };
  }, [stopCamera]);
  
  // Try to initialize the camera as soon as component mounts
  useEffect(() => {
    // Only attempt initialization once
    if (initialized || isStartingCamera) return;
    
    console.log("[ShiftCamera] Starting camera initialization");
    setInitialized(true);
    
    // Small delay to ensure DOM is ready
    initTimerRef.current = setTimeout(() => {
      initCamera();
    }, 200);
    
    return () => {
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
    };
  }, [isStartingCamera, initialized]);

  const initCamera = async () => {
    try {
      if (!videoRef.current) {
        console.log("[ShiftCamera] Video element not ready yet, starting polling");
        pollForVideoElement();
        return;
      }
      
      console.log("[ShiftCamera] Starting camera with video element:", !!videoRef.current);
      await startCamera();
      console.log("[ShiftCamera] Camera started successfully");
    } catch (error: any) {
      console.error("[ShiftCamera] Initialization error:", error);
      toast.error("Failed to access camera: " + error.message);
      setCameraError(error.message || "Camera initialization failed");
    }
  };
  
  const pollForVideoElement = () => {
    // Max retry count to avoid infinite loops
    if (initAttemptRef.current >= 10) {
      setCameraError("Failed to initialize camera after multiple attempts");
      return;
    }
    
    initAttemptRef.current++;
    console.log(`[ShiftCamera] Polling attempt ${initAttemptRef.current} for video element`);
    
    if (videoRef.current) {
      console.log("[ShiftCamera] Video element found, initializing camera");
      startCamera().catch(error => {
        console.error("[ShiftCamera] Camera start error:", error);
        setCameraError(error.message);
      });
    } else {
      // Try again after a delay
      initTimerRef.current = setTimeout(pollForVideoElement, 300);
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
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current);
    }
    setCameraError(null);
    
    // Retry initialization after a short delay
    initTimerRef.current = setTimeout(() => {
      initCamera();
    }, 200);
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
        initCamera={() => { 
          setInitialized(false); 
          initAttemptRef.current = 0; 
          handleRetry();
        }}
        handleRetry={handleRetry}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
