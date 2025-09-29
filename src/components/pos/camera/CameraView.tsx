
import { RefObject, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import TimestampOverlay from "./TimestampOverlay";
import CaptureButton from "./CaptureButton";
import { Spinner } from "@/components/ui/spinner";
import { AspectRatio } from "@/components/ui/aspect-ratio";

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
  
  // Create video element directly in the component
  useEffect(() => {
    if (!videoRef.current) {
      console.log("[CameraView] Video element ref is null, cannot initialize");
      return;
    }

    // Make sure video has necessary attributes
    const video = videoRef.current;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    
    // Debug info
    console.log("[CameraView] Video element prepared:", video);
    
    // Add click handler for debugging
    video.addEventListener('click', logVideoState);
    
    return () => {
      if (video) {
        video.removeEventListener('click', logVideoState);
      }
    };
  }, [videoRef, logVideoState]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div className="w-full h-full flex items-center justify-center">
        <video 
          ref={videoRef}
          className="w-full h-full object-contain max-h-full" 
          autoPlay
          playsInline
          muted
        />
      </div>
      
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
