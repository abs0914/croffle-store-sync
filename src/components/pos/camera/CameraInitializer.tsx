
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface CameraInitializerProps {
  initCamera: () => void;
  isStartingCamera: boolean;
  cameraError: string | null;
  logVideoState: () => void;
  handleRetry: () => void;
}

export default function CameraInitializer({
  initCamera,
  isStartingCamera,
  cameraError,
  logVideoState,
  handleRetry
}: CameraInitializerProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      {isStartingCamera ? (
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Initializing camera...</p>
        </div>
      ) : (
        <Button 
          onClick={initCamera} 
          variant="outline"
          className="mb-2"
          disabled={isStartingCamera}
        >
          <Camera className="mr-2 h-4 w-4" />
          Enable Camera
        </Button>
      )}
      
      {cameraError && (
        <div className="text-xs text-red-500 text-center px-4 mt-2 max-w-[90%]">
          <p className="mb-1">{cameraError}</p>
          <div className="flex gap-2 justify-center mt-1">
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs p-0 h-auto flex items-center" 
              onClick={() => logVideoState()}
            >
              <span>Check status</span>
            </Button>
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs p-0 h-auto flex items-center" 
              onClick={handleRetry}
              disabled={isStartingCamera}
            >
              <RefreshCcw className="mr-1 h-3 w-3" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
