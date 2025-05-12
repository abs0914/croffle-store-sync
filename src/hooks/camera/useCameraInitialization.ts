
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
      console.log(`Attempting to start camera (attempt ${attemptCount.current})`);
      
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera access');
      }
      
      // Check if video element exists before proceeding
      if (!videoRef.current) {
        console.log('Video element reference is null');
        
        // If we haven't hit max retries, schedule another attempt
        if (attemptCount.current < maxRetries) {
          const retryDelay = Math.min(1000 * attemptCount.current, 3000); // Exponential backoff up to 3 seconds
          console.log(`Scheduling retry in ${retryDelay}ms`);
          
          retryTimeoutRef.current = setTimeout(() => {
            startCamera();
          }, retryDelay);
          
          return;
        }
        throw new Error('Camera initialization failed - video element not found');
      }
      
      // Define camera constraints
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!videoRef.current) {
        console.log('Video element lost after camera initialization');
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Video element disappeared during camera setup');
      }
      
      // Set the stream as the video source
      videoRef.current.srcObject = stream;
      
      // Set up event listeners for the video element
      videoRef.current.onloadedmetadata = () => {
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.error("Error playing video:", err);
            setCameraError(`Could not start video: ${err.message}`);
          });
          setCameraInitialized(true);
        }
      };
      
      // Store the stream reference for cleanup
      mediaStreamRef.current = stream;
      setShowCamera(true);
      setIsStartingCamera(false);
      
      console.log('Camera started, stream tracks:', stream.getTracks().length);
      return true;
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setCameraError(error.message || 'Failed to access camera');
      toast.error('Camera access failed. Please check permissions.');
      setShowCamera(false);
      setIsStartingCamera(false);
      
      // Re-throw the error so the caller can handle it
      throw error;
    }
  }, [
    videoRef, 
    mediaStreamRef, 
    attemptCount, 
    retryTimeoutRef, 
    resetCameraState, 
    setShowCamera, 
    setCameraError, 
    setCameraInitialized, 
    setIsStartingCamera, 
    maxRetries
  ]);
  
  return { startCamera };
}
