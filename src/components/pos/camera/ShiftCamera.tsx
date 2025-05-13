
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
  const [initTimerRef, setInitTimerRef] = useState<NodeJS.Timeout | null>(null);
  const [isCommitted, setIsCommitted] = useState(false);
  
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
  
  // Mark component as committed after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCommitted(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Only perform cleanup if component is fully committed (past initial render phase)
      if (isCommitted) {
        console.log('[ShiftCamera] Component unmounting, cleaning up resources');
        stopCamera();
        if (initTimerRef) {
          clearTimeout(initTimerRef);
        }
      }
    };
  }, [stopCamera, initTimerRef, isCommitted]);
  
  // Initialize camera after a short delay to ensure component is stable
  useEffect(() => {
    if (!attemptedInit && isCommitted) {
      console.log("[ShiftCamera] Auto-initializing camera on component mount");
      setAttemptedInit(true);
      setShowCamera(true);
      
      // Longer delay to ensure DOM is ready and component is stable
      const timer = setTimeout(() => {
        startCamera().catch(error => {
          console.error("[ShiftCamera] Auto-init failed:", error);
          setCameraError(error.message || "Failed to initialize camera");
        });
      }, 500); // Increased from 100ms to 500ms
      
      setInitTimerRef(timer);
      
      return () => {
        if (timer) {
          clearTimeout(timer);
        }
      };
    }
  }, [attemptedInit, startCamera, setShowCamera, setCameraError, isCommitted]);

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
    console.log("[ShiftCamera] Retrying camera initialization");
    if (isCommitted) {
      stopCamera();
      setAttemptedInit(false);
      setCameraError(null);
      
      // Retry initialization after a longer delay
      const timer = setTimeout(() => {
        setShowCamera(true);
        startCamera().catch(error => {
          console.error("[ShiftCamera] Retry failed:", error);
          setCameraError(error.message || "Failed to initialize camera");
        });
      }, 500); // Increased from 100ms to 500ms
      
      setInitTimerRef(timer);
    }
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
          if (isCommitted) {
            setAttemptedInit(false);
            handleRetry();
          }
        }}
        handleRetry={handleRetry}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
