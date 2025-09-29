
import { useRef } from "react";
import CameraView from "./CameraView";
import PhotoPreview from "./PhotoPreview";
import CameraInitializer from "./CameraInitializer";

interface CameraContainerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  showCamera: boolean;
  photo: string | null;
  cameraInitialized: boolean;
  isStartingCamera: boolean;
  cameraError: string | null;
  logVideoState: () => void;
  resetPhoto: () => void;
  initCamera: () => void;
  handleRetry: () => void;
}

export default function CameraContainer({
  videoRef,
  showCamera,
  photo,
  cameraInitialized,
  isStartingCamera,
  cameraError,
  logVideoState,
  resetPhoto,
  initCamera,
  handleRetry
}: CameraContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={containerRef}
      className="w-full bg-black rounded-md relative overflow-hidden h-[50vh] md:h-[60vh] min-h-[400px]"
    >
      {showCamera ? (
        <CameraView 
          videoRef={videoRef}
          cameraInitialized={cameraInitialized}
          isStartingCamera={isStartingCamera}
          logVideoState={logVideoState}
        />
      ) : photo ? (
        <PhotoPreview photoUrl={photo} onReset={resetPhoto} />
      ) : (
        <CameraInitializer 
          initCamera={initCamera}
          isStartingCamera={isStartingCamera}
          cameraError={cameraError}
          logVideoState={logVideoState}
          handleRetry={handleRetry}
        />
      )}
    </div>
  );
}
