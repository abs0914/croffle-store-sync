
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw, AlertCircle, Settings } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const openCameraSettings = () => {
    // For Chrome/Edge
    if (navigator.userAgent.includes('Chrome')) {
      window.open('chrome://settings/content/camera', '_blank');
    }
    // For Firefox
    else if (navigator.userAgent.includes('Firefox')) {
      alert('Please go to Firefox Settings > Privacy & Security > Permissions > Camera to manage camera permissions');
    }
    // For Safari
    else if (navigator.userAgent.includes('Safari')) {
      alert('Please go to Safari > Preferences > Websites > Camera to manage camera permissions');
    }
    // Generic fallback
    else {
      alert('Please check your browser settings to allow camera access for this website');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {isStartingCamera ? (
        <div className="text-center">
          <Spinner className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">Initializing camera...</p>
          <p className="text-xs text-muted-foreground mt-1">Please wait while we connect to your camera</p>
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
        <Alert variant="destructive" className="mt-3 mx-auto max-w-[95%]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <p className="mb-2">{cameraError}</p>
            
            {/* Show specific help based on error type */}
            {cameraError.includes('busy') && (
              <div className="bg-yellow-50 p-2 rounded text-xs mb-2">
                <p className="font-medium">Camera is in use:</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>Close other browser tabs using the camera</li>
                  <li>Close other applications (Zoom, Skype, etc.)</li>
                  <li>Restart your browser if needed</li>
                </ul>
              </div>
            )}
            
            {cameraError.includes('denied') && (
              <div className="bg-blue-50 p-2 rounded text-xs mb-2">
                <p className="font-medium">Camera access denied:</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>Click the camera icon in your address bar</li>
                  <li>Select "Allow" for camera access</li>
                  <li>Refresh the page after allowing</li>
                </ul>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 justify-start mt-2">
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
              
              {cameraError.includes('denied') && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs p-0 h-auto flex items-center" 
                  onClick={openCameraSettings}
                >
                  <Settings className="mr-1 h-3 w-3" />
                  <span>Camera Settings</span>
                </Button>
              )}
              
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs p-0 h-auto flex items-center" 
                onClick={logVideoState}
              >
                <span>Debug Info</span>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
