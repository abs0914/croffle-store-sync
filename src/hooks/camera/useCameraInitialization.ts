
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
      // Stop any existing stream first to prevent conflicts
      if (mediaStreamRef.current) {
        console.log('[Camera] Stopping existing stream before new attempt');
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
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
      
      // Wait for video element to be available
      let videoElement = videoRef.current;
      if (!videoElement) {
        console.log('[Camera] Video element not immediately available, waiting...');
        
        // Wait longer for ref to connect
        await new Promise(resolve => setTimeout(resolve, 200));
        videoElement = videoRef.current;
        
        if (!videoElement) {
          console.error('[Camera] Video element reference is still null after waiting');
          throw new Error('Video element not found');
        }
      }
      
      console.log('[Camera] Video element found, requesting camera access');
      
      // Try different constraint sets for better compatibility
      const constraintSets = [
        // Primary constraints - prefer back camera
        { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1080 },
            height: { ideal: 1440 },
            aspectRatio: { ideal: 3/4 }
          },
          audio: false
        },
        // Fallback 1 - any camera with specific resolution
        { 
          video: { 
            width: { ideal: 720 },
            height: { ideal: 960 },
            aspectRatio: { ideal: 3/4 }
          },
          audio: false
        },
        // Fallback 2 - basic constraints
        { 
          video: true,
          audio: false
        }
      ];
      
      let stream: MediaStream | null = null;
      let lastError: Error | null = null;
      
      // Try each constraint set
      for (let i = 0; i < constraintSets.length; i++) {
        try {
          console.log(`[Camera] Trying constraint set ${i + 1}:`, constraintSets[i]);
          stream = await navigator.mediaDevices.getUserMedia(constraintSets[i]);
          console.log(`[Camera] Successfully got stream with constraint set ${i + 1}`);
          break;
        } catch (error: any) {
          console.log(`[Camera] Constraint set ${i + 1} failed:`, error.message);
          lastError = error;
          
          // If this is a "NotReadableError", wait before trying next set
          if (error.name === 'NotReadableError') {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      if (!stream) {
        throw lastError || new Error('Failed to access camera with any constraints');
      }
      
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
        const currentVideo = videoRef.current;
        if (!currentVideo) return;
        
        console.log('[Camera] Video metadata loaded, playing video');
        currentVideo.play().catch(err => {
          console.error("[Camera] Error playing video:", err);
          setCameraError(`Could not start video: ${err.message}`);
        });
      };
      
      // Additional event to make sure we know when video is actually playing
      videoElement.onplaying = () => {
        console.log('[Camera] Video is now playing successfully');
        setCameraInitialized(true);
        setIsStartingCamera(false);
        setCameraError(null); // Clear any previous errors
      };
      
      // Handle video errors
      videoElement.onerror = (error) => {
        console.error('[Camera] Video element error:', error);
        setCameraError('Video playback failed');
        setIsStartingCamera(false);
      };
      
      // Store the stream reference for cleanup
      mediaStreamRef.current = stream;
      setShowCamera(true);
      
      console.log('[Camera] Stream setup complete, tracks:', stream.getTracks().length);
      return true;
      
    } catch (error: any) {
      console.error('[Camera] Error accessing camera:', error);
      
      let errorMessage = 'Failed to access camera';
      
      // Provide more specific error messages
      switch (error.name) {
        case 'NotReadableError':
          errorMessage = 'Camera is busy or unavailable. Please close other apps using the camera and try again.';
          break;
        case 'NotAllowedError':
          errorMessage = 'Camera access denied. Please allow camera permissions and refresh the page.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera found on this device.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera constraints not supported. Using basic camera settings.';
          break;
        default:
          errorMessage = error.message || 'Failed to access camera';
      }
      
      setCameraError(errorMessage);
      toast.error(errorMessage);
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
