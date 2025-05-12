
import { useState, useRef } from "react";

export function useCameraState() {
  // Basic camera state
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  
  // Refs for tracking camera resources
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const attemptCount = useRef<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  return {
    // State
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
    
    // Refs
    videoRef,
    canvasRef,
    mediaStreamRef,
    attemptCount,
    retryTimeoutRef,
  };
}
