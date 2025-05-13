
import { useCallback, useRef } from "react";
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
  const initCountRef = useRef(0);
  
  const startCamera = useCallback(async () => {
    try {
      initCountRef.current += 1;
      console.log(`[Camera] Starting camera initialization (count: ${initCountRef.current})`);
      
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
        
        // Longer timeout to allow ref to connect
        await new Promise(resolve => setTimeout(resolve, 500)); // Increased from 300ms to 500ms
        videoElement = videoRef.current;
        
        if (!videoElement) {
          console.error('[Camera] Video element reference is still null after waiting');
          throw new Error('Video element not found');
        }
      }
      
      console.log('[Camera] Video element found, requesting camera access');
      
      // Check if there are any existing tracks and stop them
      if (mediaStreamRef.current) {
        console.log('[Camera] Stopping existing media tracks before requesting new ones');
        mediaStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.error('[Camera] Error stopping track:', err);
          }
        });
        mediaStreamRef.current = null;
      }

      // Additional check for active camera usage across all browser tabs
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('[Camera] Available devices:', devices.length);
      } catch (err) {
        console.warn('[Camera] Could not enumerate devices:', err);
      }
      
      // Define camera constraints
      const constraints = { 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      // Request camera access with a timeout
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<MediaStream>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Camera access request timed out after 15 seconds'));
        }, 15000); // Increased from 10s to 15s
      });
      
      // Request camera with timeout
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia(constraints)
          .catch(error => {
            console.error('[Camera] MediaDevices error:', error.name, error.message);
            
            // Device in use error handling
            if (error.name === 'NotReadableError' || error.message.includes('in use') || error.message.includes('is already in use')) {
              throw new Error('Camera is already in use by another application or browser tab. Please close other apps using the camera and try again.');
            }
            
            // Permission denied handling
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              throw new Error('Camera access denied. Please allow camera access in your browser settings.');
            }
            
            // Re-throw the error if it's something else
            throw error;
          }),
        timeoutPromise
      ]) as MediaStream;
      
      // Clear timeout if stream was obtained
      clearTimeout(timeoutId!);
      
      console.log('[Camera] Camera access granted, attaching stream, tracks:', stream.getTracks().length);
      
      // Double-check video element is still available
      videoElement = videoRef.current;
      if (!videoElement) {
        console.error('[Camera] Video element disappeared during initialization');
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Video element lost during camera setup');
      }
      
      // Store the stream reference for cleanup before attaching to video
      mediaStreamRef.current = stream;
      
      // Connect the stream to the video element
      try {
        videoElement.srcObject = stream;
        console.log('[Camera] Stream attached to video element');
      } catch (err) {
        console.error('[Camera] Error attaching stream to video:', err);
        throw new Error(`Could not attach video stream: ${err.message}`);
      }
      
      console.log('[Camera] Setting up video element events');
      
      // Set up event listeners for the video element
      const playPromise = new Promise<void>((resolve, reject) => {
        if (!videoElement) {
          reject(new Error('Video element disappeared'));
          return;
        }
        
        videoElement.onloadedmetadata = () => {
          if (!videoElement) return;
          
          console.log('[Camera] Video metadata loaded, playing video');
          try {
            videoElement.play()
              .then(() => {
                console.log('[Camera] Video playback started successfully');
                resolve();
              })
              .catch(err => {
                console.error("[Camera] Error playing video:", err);
                setCameraError(`Could not start video: ${err.message}`);
                reject(err);
              });
          } catch (err) {
            console.error("[Camera] Exception during play():", err);
            setCameraError(`Exception during video play: ${err.message}`);
            reject(err);
          }
        };
        
        videoElement.onerror = (event) => {
          console.error('[Camera] Video element error:', event);
          setCameraError('Video playback error occurred');
          reject(new Error('Video element error'));
        };
      });
      
      // Wait for play promise to resolve with timeout
      const playTimeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Video play timed out'));
        }, 5000);
      });
      
      // Wait for video to start playing
      await Promise.race([playPromise, playTimeoutPromise]);
      
      // Additional event to make sure we know when video is actually playing
      if (videoElement) {
        videoElement.onplaying = () => {
          console.log('[Camera] Video is now playing');
          setCameraInitialized(true);
          setIsStartingCamera(false);
        };
      }
      
      setShowCamera(true);
      
      console.log('[Camera] Camera initialization successful');
      return true;
    } catch (error: any) {
      console.error('[Camera] Error accessing camera:', error);
      setCameraError(error.message || 'Failed to access camera');
      toast.error('Camera access failed. Please check permissions.');
      setShowCamera(false);
      setIsStartingCamera(false);
      
      // Clean up any partial resources
      if (mediaStreamRef.current) {
        console.log('[Camera] Cleaning up stream after error');
        mediaStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.error('[Camera] Error stopping track after initialization error:', err);
          }
        });
        mediaStreamRef.current = null;
      }
      
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
