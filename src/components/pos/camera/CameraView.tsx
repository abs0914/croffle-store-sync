
import { RefObject, useEffect, useRef } from "react";
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
  const videoAttachedRef = useRef<boolean>(false);
  
  // Ensure the video element is attached to the DOM before access
  useEffect(() => {
    // Make sure video element exists in DOM
    if (containerRef.current && !videoAttachedRef.current) {
      if (!videoRef.current) {
        console.log("Creating new video element");
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.className = "w-full h-full object-cover";
        video.addEventListener('click', () => logVideoState());
        
        // Replace the existing video element if it exists
        const existingVideo = containerRef.current.querySelector('video');
        if (existingVideo) {
          containerRef.current.replaceChild(video, existingVideo);
        } else {
          containerRef.current.prepend(video);
        }
        
        // Update the ref if it's a MutableRefObject
        if (videoRef && 'current' in videoRef) {
          (videoRef as any).current = video;
        }
        
        videoAttachedRef.current = true;
        console.log("Video element created and attached to DOM");
        
        // Check after a short delay
        setTimeout(() => {
          console.log("Video element check:", videoRef.current !== null);
        }, 100);
      }
    }
    
    return () => {
      videoAttachedRef.current = false;
    };
  }, [videoRef, logVideoState]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Video element will be created and attached dynamically */}
      
      {!cameraInitialized && isStartingCamera && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
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
