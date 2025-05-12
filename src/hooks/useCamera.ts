
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

export function useCamera() {
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const attemptCount = useRef<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;

  // Clear any previous errors and camera resources when resetting
  const resetCameraState = useCallback(() => {
    setCameraError(null);
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
    attemptCount.current = 0;
  }, []);

  // Try to initialize the camera with retry mechanism
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
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setCameraError(error.message || 'Failed to access camera');
      toast.error('Camera access failed. Please check permissions.');
      setShowCamera(false);
      setIsStartingCamera(false);
    }
  }, [resetCameraState]);

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
  }, []);

  // Log video element state for debugging
  const logVideoState = useCallback(() => {
    console.log('Video element:', videoRef.current);
    if (videoRef.current) {
      console.log('Video element state:', {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
        readyState: videoRef.current.readyState,
        paused: videoRef.current.paused,
        error: videoRef.current.error,
        visibility: document.visibilityState,
        streamActive: mediaStreamRef.current?.active
      });
    } else {
      console.log('Video element is null');
    }
  }, []);

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
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(dataUrl);
        stopCamera();
        return dataUrl;
      }
    }
    console.log("Video not ready for capture");
    return null;
  }, [stopCamera]);

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
