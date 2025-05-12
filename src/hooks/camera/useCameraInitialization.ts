
import { useCallback } from "react";
import { toast } from "sonner";

interface UseCameraInitializationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  mediaStreamRef: React.MutableRefObject<MediaStream | null>;
  attemptCount: React.MutableRefObject<number>;
  retryTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  resetCameraState: () => void;
  setShowCamera: (show: boolean) => void;
  setCameraError: (error: string | null) => void;
  setCameraInitialized: (initialized: boolean) => void;
  setIsStartingCamera: (starting: boolean) => void;
}

export function useCameraInitialization({
  videoRef,
  mediaStreamRef,
  attemptCount,
  retryTimeoutRef,
  resetCameraState,
  setShowCamera,
  setCameraError,
  setCameraInitialized,
  setIsStartingCamera
}: UseCameraInitializationProps) {
  const maxRetries = 5;
  
  const startCamera = useCallback(async () => {
    try {
      // Reset camera state and set starting flag
      resetCameraState();
      setIsStartingCamera(true);
      
      // Increment attempt counter
      attemptCount.current += 1;
      console.log(`[Camera] Attempting to start camera (attempt ${attemptCount.current})`);
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera access');
      }
      
      // Verify video element before proceeding
      if (!videoRef.current) {
        console.error('[Camera] Video element reference is null');
        
        // If we haven't hit max retries, don't throw an error yet
        if (attemptCount.current < maxRetries) {
          console.log(`[Camera] Waiting for video element (attempt ${attemptCount.current}/${maxRetries})`);
          setIsStartingCamera(false);
          return false; // Return false to indicate we should retry
        }
        
        throw new Error('Video element not found');
      }
      
      // Define camera constraints
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Check if video element is still available
      if (!videoRef.current) {
        console.error('[Camera] Video element disappeared during initialization');
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Video element lost during camera setup');
      }
      
      // Connect the stream to the video element
      videoRef.current.srcObject = stream;
      
      // Set up event listeners for the video element
      videoRef.current.onloadedmetadata = () => {
        if (!videoRef.current) return;
        
        console.log('[Camera] Video metadata loaded, playing video');
        videoRef.current.play().catch(err => {
          console.error("[Camera] Error playing video:", err);
          setCameraError(`Could not start video: ${err.message}`);
        });
      };
      
      // Additional event to make sure we know when video is actually playing
      videoRef.current.onplaying = () => {
        console.log('[Camera] Video is now playing');
        setCameraInitialized(true);
        setIsStartingCamera(false);
      };
      
      // Store the stream reference for cleanup
      mediaStreamRef.current = stream;
      setShowCamera(true);
      
      console.log('[Camera] Stream attached to video element, tracks:', stream.getTracks().length);
      return true;
    } catch (error: any) {
      console.error('[Camera] Error accessing camera:', error);
      setCameraError(error.message || 'Failed to access camera');
      toast.error('Camera access failed. Please check permissions.');
      setShowCamera(false);
      setIsStartingCamera(false);
      
      return false;
    }
  }, [
    videoRef, 
    mediaStreamRef, 
    attemptCount, 
    maxRetries,
    resetCameraState, 
    setShowCamera, 
    setCameraError, 
    setCameraInitialized, 
    setIsStartingCamera
  ]);
  
  return { startCamera };
}
