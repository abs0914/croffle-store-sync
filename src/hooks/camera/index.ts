
import { UseCameraResult } from "./types";
import { useCameraState } from "./useCameraState";
import { useCameraCleanup } from "./useCameraCleanup";
import { useCameraCapture } from "./useCameraCapture";
import { useCameraInitialization } from "./useCameraInitialization";
import { useCameraDebug } from "./useCameraDebug";
import { useCameraSelection } from "../useCameraSelection";

export function useCamera(): UseCameraResult & {
  // Camera selection properties
  availableCameras: ReturnType<typeof useCameraSelection>['availableCameras'];
  selectedCameraId: string;
  selectCamera: (deviceId: string) => void;
  getSelectedCamera: ReturnType<typeof useCameraSelection>['getSelectedCamera'];
  isLoadingCameras: boolean;
  refetchCameras: () => Promise<void>;
} {
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
  
  // Set up camera selection
  const {
    availableCameras,
    selectedCameraId,
    selectCamera,
    getSelectedCamera,
    isLoading: isLoadingCameras,
    refetchCameras
  } = useCameraSelection();
  
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
  
  // Set up camera initialization function with device selection
  const { startCamera } = useCameraInitialization({
    videoRef,
    mediaStreamRef,
    attemptCount,
    retryTimeoutRef,
    resetCameraState,
    setShowCamera,
    setCameraError,
    setCameraInitialized,
    setIsStartingCamera,
    selectedCameraId
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
    capturePhoto,
    // Camera selection
    availableCameras,
    selectedCameraId,
    selectCamera,
    getSelectedCamera,
    isLoadingCameras,
    refetchCameras
  };
}

// Re-export for convenience
export * from "./types";
