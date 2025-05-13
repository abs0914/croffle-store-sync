
import { useCallback, useEffect } from "react";

interface UseCameraCleanupProps {
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  videoRef: React.RefObject<HTMLVideoElement>;
  retryTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setShowCamera: (show: boolean) => void;
  setCameraInitialized: (initialized: boolean) => void;
  setIsStartingCamera: (starting: boolean) => void;
}

export function useCameraCleanup({
  mediaStreamRef,
  videoRef,
  retryTimeoutRef,
  setShowCamera,
  setCameraInitialized,
  setIsStartingCamera
}: UseCameraCleanupProps) {
  // Reset camera state function
  const resetCameraState = useCallback(() => {
    // Clear any previous errors and camera resources
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraInitialized(false);
    setIsStartingCamera(false);
    
    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [mediaStreamRef, retryTimeoutRef, setCameraInitialized, setIsStartingCamera]);

  // Stop camera function
  const stopCamera = useCallback(() => {
    // Clear any pending retry attempts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Stop all media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
    setCameraInitialized(false);
    setIsStartingCamera(false);
  }, [mediaStreamRef, videoRef, retryTimeoutRef, setShowCamera, setCameraInitialized, setIsStartingCamera]);

  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStreamRef, retryTimeoutRef]);
  
  return {
    resetCameraState,
    stopCamera
  };
}
