
import { RefObject } from "react";
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

  return (
    <div className="relative w-full h-full">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover"
        onClick={() => logVideoState()}
      />
      
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
