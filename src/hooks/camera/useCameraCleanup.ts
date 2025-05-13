
import { useCallback, useEffect, useRef } from "react";

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
  // Track whether we've completed initial setup
  const initializedRef = useRef(false);
  
  // Set initialization status after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      initializedRef.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Reset camera state function
  const resetCameraState = useCallback(() => {
    console.log('[CameraCleanup] Resetting camera state');
    
    // Clear any previous errors and camera resources
    if (mediaStreamRef.current) {
      console.log('[CameraCleanup] Stopping tracks from reset function');
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          console.log('[CameraCleanup] Track stopped:', track.kind, track.id);
        } catch (err) {
          console.error('[CameraCleanup] Error stopping track:', err);
        }
      });
      mediaStreamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        console.log('[CameraCleanup] Clearing video srcObject');
        videoRef.current.srcObject = null;
      } catch (err) {
        console.error('[CameraCleanup] Error clearing video srcObject:', err);
      }
    }
    
    setCameraInitialized(false);
    setIsStartingCamera(false);
    
    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [mediaStreamRef, videoRef, retryTimeoutRef, setCameraInitialized, setIsStartingCamera]);

  // Stop camera function
  const stopCamera = useCallback(() => {
    // Only perform full cleanup if we're past initialization phase
    if (initializedRef.current) {
      console.log('[CameraCleanup] Stopping camera');
      
      // Clear any pending retry attempts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Stop all media tracks
      if (mediaStreamRef.current) {
        console.log('[CameraCleanup] Stopping media tracks');
        mediaStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
            console.log('[CameraCleanup] Track stopped:', track.kind, track.readyState);
          } catch (err) {
            console.error('[CameraCleanup] Error stopping track:', err);
          }
        });
        mediaStreamRef.current = null;
      }
      
      // Clear video source
      if (videoRef.current) {
        try {
          console.log('[CameraCleanup] Clearing video element srcObject');
          videoRef.current.srcObject = null;
        } catch (err) {
          console.error('[CameraCleanup] Error clearing video srcObject:', err);
        }
      }
      
      setShowCamera(false);
      setCameraInitialized(false);
      setIsStartingCamera(false);
    } else {
      console.log('[CameraCleanup] Skipping full cleanup during initialization phase');
      // Just update states without stopping tracks during initialization phase
      setShowCamera(false);
      setCameraInitialized(false);
      setIsStartingCamera(false);
    }
  }, [mediaStreamRef, videoRef, retryTimeoutRef, setShowCamera, setCameraInitialized, setIsStartingCamera, initializedRef]);

  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      // Only perform unmount cleanup if we're fully initialized
      if (initializedRef.current) {
        console.log('[CameraCleanup] Component unmounting, cleaning up resources');
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => {
            try {
              track.stop();
              console.log('[CameraCleanup] Track stopped on unmount:', track.kind);
            } catch (err) {
              console.error('[CameraCleanup] Error stopping track on unmount:', err);
            }
          });
        }
      } else {
        console.log('[CameraCleanup] Skipping unmount cleanup during initialization phase');
      }
    };
  }, [mediaStreamRef, retryTimeoutRef, initializedRef]);
  
  return {
    resetCameraState,
    stopCamera
  };
}
