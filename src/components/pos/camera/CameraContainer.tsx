
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
  handleCaptureClick: () => void;
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
  handleCaptureClick,
  resetPhoto,
  initCamera,
  handleRetry
}: CameraContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={containerRef}
      className="w-full h-80 bg-black rounded-md relative overflow-hidden" /* Increased height from h-48 to h-80 */
    >
      {showCamera ? (
        <CameraView 
          videoRef={videoRef}
          cameraInitialized={cameraInitialized}
          isStartingCamera={isStartingCamera}
          logVideoState={logVideoState}
          onCaptureClick={handleCaptureClick}
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
