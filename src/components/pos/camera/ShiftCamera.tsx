
import { useEffect, useState, useRef } from "react";
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
  const mountCountRef = useRef(0);
  
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
  
  // Mark component as committed after initial render with increased delay
  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`[ShiftCamera] Mounting count: ${mountCountRef.current}, setting up commit timer`);
    
    const timer = setTimeout(() => {
      console.log('[ShiftCamera] Component committed');
      setIsCommitted(true);
    }, 800); // Increased from 300ms to 800ms
    
    return () => {
      console.log(`[ShiftCamera] Clearing commit timer on unmount`);
      clearTimeout(timer);
    };
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
      } else {
        console.log('[ShiftCamera] Component unmounting during setup phase, skipping full cleanup');
      }
    };
  }, [stopCamera, initTimerRef, isCommitted]);
  
  // Initialize camera after a longer delay to ensure component is stable
  useEffect(() => {
    console.log(`[ShiftCamera] Init effect running - attemptedInit: ${attemptedInit}, isCommitted: ${isCommitted}`);
    
    if (!attemptedInit && isCommitted) {
      console.log("[ShiftCamera] Auto-initializing camera on component mount");
      setAttemptedInit(true);
      setShowCamera(true);
      
      // Longer delay to ensure DOM is ready and component is stable
      const timer = setTimeout(() => {
        console.log("[ShiftCamera] Starting camera after delay");
        startCamera().catch(error => {
          console.error("[ShiftCamera] Auto-init failed:", error);
          setCameraError(error.message || "Failed to initialize camera");
        });
      }, 1000); // Increased from 500ms to 1000ms
      
      setInitTimerRef(timer);
      
      return () => {
        if (timer) {
          console.log("[ShiftCamera] Clearing camera init timer");
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
        console.log("[ShiftCamera] Starting camera after retry delay");
        startCamera().catch(error => {
          console.error("[ShiftCamera] Retry failed:", error);
          setCameraError(error.message || "Failed to initialize camera");
        });
      }, 1000); // Increased from 500ms to 1000ms
      
      setInitTimerRef(timer);
    } else {
      console.log("[ShiftCamera] Not committed yet, delaying retry");
      setTimeout(() => handleRetry(), 500);
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
          } else {
            console.log("[ShiftCamera] Not committed yet, delaying camera init");
            setTimeout(() => handleRetry(), 500);
          }
        }}
        handleRetry={handleRetry}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
