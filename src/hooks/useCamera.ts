
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

export function useCamera() {
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const attemptCount = useRef<number>(0);

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing streams first
      stopCamera();
      
      // Increment attempt counter
      attemptCount.current += 1;
      console.log(`Attempting to start camera (attempt ${attemptCount.current})`);
      
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera access');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error("Error playing video:", err);
              toast.error("Could not start video: " + err.message);
            });
          }
        };
        
        mediaStreamRef.current = stream;
        setShowCamera(true);
        
        // Debug log to verify camera is starting
        console.log('Camera started, stream tracks:', stream.getTracks().length);
        
        // Force a repaint to ensure video element is properly displayed
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.style.display = "none";
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.style.display = "block";
              }
            }, 10);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
      setShowCamera(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
  }, []);

  // Log video element state for debugging
  const logVideoState = useCallback(() => {
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
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    showCamera,
    setShowCamera,
    photo,
    setPhoto,
    startCamera,
    stopCamera,
    logVideoState
  };
}
