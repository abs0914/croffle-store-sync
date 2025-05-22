
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
  const maxRetries = 3;
  
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
      
      // Wait for video element to be available (give it a little time)
      let videoElement = videoRef.current;
      if (!videoElement) {
        console.log('[Camera] Video element not immediately available, waiting briefly...');
        
        // Short timeout to allow ref to connect
        await new Promise(resolve => setTimeout(resolve, 50));
        videoElement = videoRef.current;
        
        if (!videoElement) {
          console.error('[Camera] Video element reference is still null after waiting');
          throw new Error('Video element not found');
        }
      }
      
      console.log('[Camera] Video element found, requesting camera access');
      
      // Define camera constraints for 3:4 aspect ratio (taller) with slightly "zoomed out" view
      const constraints = { 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1080 },
          height: { ideal: 1440 }, // 3:4 ratio (1080 * 4/3)
          aspectRatio: { ideal: 3/4 },
          // Adding zoom level if available through advanced constraints (not supported on all browsers)
          advanced: [
            { zoom: 0.9 } // Zoom out slightly if supported
          ]
        },
        audio: false
      };
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[Camera] Camera access granted, attaching stream');
      
      // Double-check video element is still available
      videoElement = videoRef.current;
      if (!videoElement) {
        console.error('[Camera] Video element disappeared during initialization');
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Video element lost during camera setup');
      }
      
      // Connect the stream to the video element
      videoElement.srcObject = stream;
      
      console.log('[Camera] Stream attached to video element, setting up events');
      
      // Set up event listeners for the video element
      videoElement.onloadedmetadata = () => {
        videoElement = videoRef.current;
        if (!videoElement) return;
        
        console.log('[Camera] Video metadata loaded, playing video');
        videoElement.play().catch(err => {
          console.error("[Camera] Error playing video:", err);
          setCameraError(`Could not start video: ${err.message}`);
        });
      };
      
      // Additional event to make sure we know when video is actually playing
      videoElement.onplaying = () => {
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
