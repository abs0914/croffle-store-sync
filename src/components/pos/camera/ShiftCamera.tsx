
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { useCamera } from "@/hooks/camera";  
import CameraContainer from "./CameraContainer";
import { toast } from "sonner";

interface ShiftCameraProps {
  onCapture: (photoUrl: string | null) => void;
  onReset?: () => void;
}

export default function ShiftCamera({ onCapture, onReset }: ShiftCameraProps) {
  const [attemptedInit, setAttemptedInit] = useState(false);
  const initTimerRef = useState<NodeJS.Timeout | null>(null)[0];
  
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
    capturePhoto,
    setShowCamera
  } = useCamera();
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      stopCamera();
      if (initTimerRef) {
        clearTimeout(initTimerRef);
      }
    };
  }, [stopCamera, initTimerRef]);
  
  // Initialize camera as soon as component mounts
  useEffect(() => {
    if (!attemptedInit) {
      console.log("[ShiftCamera] Auto-initializing camera on component mount");
      setAttemptedInit(true);
      setShowCamera(true);
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        startCamera().catch(error => {
          console.error("[ShiftCamera] Auto-init failed:", error);
          setCameraError(error.message || "Failed to initialize camera");
        });
      }, 100);
    }
  }, [attemptedInit, startCamera, setShowCamera, setCameraError]);

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
    if (onReset) {
      onReset();
    }
  };
  
  const handleRetry = () => {
    stopCamera();
    setAttemptedInit(false);
    setCameraError(null);
    
    // Retry initialization after a short delay
    setTimeout(() => {
      setShowCamera(true);
      startCamera().catch(error => {
        console.error("[ShiftCamera] Retry failed:", error);
        setCameraError(error.message || "Failed to initialize camera");
      });
    }, 100);
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
          setAttemptedInit(false);
          handleRetry();
        }}
        handleRetry={handleRetry}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
