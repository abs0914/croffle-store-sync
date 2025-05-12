
import { UseCameraResult } from "./types";
import { useCameraState } from "./useCameraState";
import { useCameraCleanup } from "./useCameraCleanup";
import { useCameraCapture } from "./useCameraCapture";
import { useCameraInitialization } from "./useCameraInitialization";
import { useCameraDebug } from "./useCameraDebug";

export function useCamera(): UseCameraResult {
  // Set up camera state and refs
  const {
    showCamera,
    setShowCamera,
    photo,
    setPhoto,
    cameraError,
    setCameraError,
    cameraInitialized,
    setCameraInitialized,
    isStartingCamera,
    setIsStartingCamera,
    videoRef,
    canvasRef,
    mediaStreamRef,
    attemptCount,
    retryTimeoutRef
  } = useCameraState();
  
  // Set up camera cleanup functions
  const { resetCameraState, stopCamera } = useCameraCleanup({
    mediaStreamRef,
    videoRef,
    retryTimeoutRef,
    setShowCamera,
    setCameraInitialized,
    setIsStartingCamera
  });
  
  // Set up camera capture function
  const { capturePhoto } = useCameraCapture({
    videoRef,
    canvasRef,
    setPhoto,
    stopCamera
  });
  
  // Set up camera initialization function
  const { startCamera } = useCameraInitialization({
    videoRef,
    mediaStreamRef,
    attemptCount,
    retryTimeoutRef,
    resetCameraState,
    setShowCamera,
    setCameraError,
    setCameraInitialized,
    setIsStartingCamera
  });
  
  // Set up camera debug function
  const { logVideoState } = useCameraDebug({
    videoRef,
    mediaStreamRef
  });

  // Return the combined hook API
  return {
    videoRef,
    canvasRef,
    showCamera,
    setShowCamera,
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
  };
}

// Re-export for convenience
export * from "./types";
