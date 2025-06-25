
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { useCamera } from "@/hooks/camera";  
import CameraContainer from "./CameraContainer";
import CameraSelector from "@/components/camera/CameraSelector";
import { toast } from "sonner";

interface ShiftCameraProps {
  onCapture: (photoUrl: string | null) => void;
  onReset?: () => void;
}

export default function ShiftCamera({ onCapture, onReset }: ShiftCameraProps) {
  const [attemptedInit, setAttemptedInit] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
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
    setShowCamera,
    // Camera selection
    availableCameras,
    selectedCameraId,
    selectCamera,
    getSelectedCamera,
    isLoadingCameras
  } = useCamera();
  
  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      console.log('[ShiftCamera] Component unmounting, cleaning up camera');
      stopCamera();
    };
  }, [stopCamera]);
  
  // Initialize camera when component mounts or when camera selection changes
  useEffect(() => {
    if (!attemptedInit && retryCount < maxRetries && selectedCameraId) {
      console.log(`[ShiftCamera] Auto-initializing camera (attempt ${retryCount + 1}) with camera: ${getSelectedCamera()?.label}`);
      setAttemptedInit(true);
      setShowCamera(true);
      
      // Add a delay to ensure DOM is ready and avoid rapid retries
      const delay = retryCount > 0 ? 1000 * retryCount : 100;
      
      setTimeout(() => {
        startCamera().then(success => {
          if (!success && retryCount < maxRetries - 1) {
            console.log(`[ShiftCamera] Auto-init attempt ${retryCount + 1} failed, will retry`);
            setRetryCount(prev => prev + 1);
            setAttemptedInit(false);
          }
        }).catch(error => {
          console.error(`[ShiftCamera] Auto-init attempt ${retryCount + 1} failed:`, error);
          setCameraError(error.message || "Failed to initialize camera");
          
          if (retryCount < maxRetries - 1) {
            setRetryCount(prev => prev + 1);
            setAttemptedInit(false);
          }
        });
      }, delay);
    }
  }, [attemptedInit, retryCount, startCamera, setShowCamera, setCameraError, selectedCameraId, getSelectedCamera]);

  // Handle camera selection change
  const handleCameraSelect = (deviceId: string) => {
    console.log('[ShiftCamera] Camera selection changed, restarting camera');
    
    // Stop current camera
    stopCamera();
    
    // Reset states
    setAttemptedInit(false);
    setCameraError(null);
    setRetryCount(0);
    
    // Select new camera
    selectCamera(deviceId);
  };

  const handleCaptureClick = () => {
    try {
      const photoUrl = capturePhoto();
      if (photoUrl) {
        console.log('[ShiftCamera] Photo captured successfully');
        onCapture(photoUrl);
      } else {
        console.error('[ShiftCamera] Failed to capture photo');
        toast.error("Failed to capture photo. Please try again.");
      }
    } catch (error) {
      console.error('[ShiftCamera] Error during photo capture:', error);
      toast.error("Error capturing photo. Please try again.");
    }
  };
  
  const resetPhoto = () => {
    console.log('[ShiftCamera] Resetting photo');
    setPhoto(null);
    onCapture(null);
    if (onReset) {
      onReset();
    }
  };
  
  const handleRetry = () => {
    console.log('[ShiftCamera] Manual retry requested');
    
    // Reset states
    stopCamera();
    setAttemptedInit(false);
    setCameraError(null);
    setRetryCount(0);
    
    // Retry initialization after cleanup
    setTimeout(() => {
      setShowCamera(true);
      startCamera().catch(error => {
        console.error("[ShiftCamera] Manual retry failed:", error);
        setCameraError(error.message || "Failed to initialize camera");
      });
    }, 500);
  };
  
  return (
    <div className="space-y-4">
      <Label>Capture Photo</Label>
      
      {/* Camera Selection */}
      <CameraSelector
        cameras={availableCameras}
        selectedCameraId={selectedCameraId}
        onCameraSelect={handleCameraSelect}
        isLoading={isLoadingCameras}
      />
      
      {retryCount >= maxRetries && cameraError && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
          Camera initialization failed after {maxRetries} attempts. You can still continue without a photo, or try selecting a different camera or the manual retry button below.
        </div>
      )}
      
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
          setRetryCount(0);
          handleRetry();
        }}
        handleRetry={handleRetry}
      />
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
