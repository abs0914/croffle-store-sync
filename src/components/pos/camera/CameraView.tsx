
import { RefObject, useEffect, useRef, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import TimestampOverlay from "./TimestampOverlay";
import CaptureButton from "./CaptureButton";
import { Spinner } from "@/components/ui/spinner";

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  cameraInitialized: boolean;
  isStartingCamera: boolean;
  logVideoState: () => void;
  onCaptureClick: () => void;
}

export default function CameraView({
  videoRef,
  cameraInitialized,
  isStartingCamera,
  logVideoState,
  onCaptureClick
}: CameraViewProps) {
  const { currentStore } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoMounted, setVideoMounted] = useState(false);
  
  // Create and mount the video element
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create a new video element if one doesn't exist yet
    if (!videoRef.current) {
      const videoElement = document.createElement('video');
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true; // Adding muted to help with autoplay policies
      videoElement.className = "w-full h-full object-cover";
      
      // Add click handler for debugging
      videoElement.addEventListener('click', logVideoState);
      
      // Clean up the container first
      const container = containerRef.current;
      const existingVideo = container.querySelector('video');
      if (existingVideo) {
        container.removeChild(existingVideo);
      }
      
      // Append the new video element
      container.appendChild(videoElement);
      
      // Set the ref
      if ('current' in videoRef) {
        (videoRef as any).current = videoElement;
      }
      
      // Mark as mounted
      console.log("Video element created and mounted to DOM");
      setVideoMounted(true);
      
      // Debug
      setTimeout(() => {
        console.log("Video element check after mounting:", !!videoRef.current);
      }, 100);
    }
    
    return () => {
      if (videoRef.current && containerRef.current?.contains(videoRef.current)) {
        try {
          containerRef.current.removeChild(videoRef.current);
          console.log("Video element removed during cleanup");
        } catch (e) {
          console.log("Error removing video element:", e);
        }
      }
    };
  }, [videoRef, logVideoState]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black">
      {/* Video element is created and attached dynamically */}
      
      {!cameraInitialized && isStartingCamera && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <div className="text-white text-center">
            <Spinner className="h-8 w-8 mx-auto mb-2" />
            <p>Initializing camera...</p>
          </div>
        </div>
      )}
      
      {cameraInitialized && (
        <>
          <TimestampOverlay storeName={currentStore?.name} />
          <CaptureButton onClick={onCaptureClick} />
        </>
      )}
    </div>
  );
}
