
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, CameraOff } from "lucide-react";
import ShiftCamera from "../../camera/ShiftCamera";
import { useState } from "react";

interface ShiftPhotoSectionProps {
  photo: string | null;
  setPhoto: (photo: string | null) => void;
  showCameraView: boolean;
  setShowCameraView: (show: boolean) => void;
}

export default function ShiftPhotoSection({
  photo,
  setPhoto,
  showCameraView,
  setShowCameraView
}: ShiftPhotoSectionProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const toggleCameraView = () => {
    setShowCameraView(!showCameraView);
    setCameraError(null); // Reset error state when toggling
  };

  const handleCameraError = (message: string) => {
    setCameraError(message);
    setShowCameraView(false);
  };

  return (
    <div className="space-y-2">
      <Label>Shift Photo</Label>
      {showCameraView ? (
        <div className="border rounded-md p-2 bg-muted/10">
          <ShiftCamera 
            onCapture={(capturedPhoto) => {
              if (capturedPhoto) {
                setPhoto(capturedPhoto);
                setShowCameraView(false);
              } else {
                handleCameraError("Failed to capture photo");
              }
            }}
            onReset={() => setShowCameraView(false)}
          />
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {photo ? (
            <div className="relative w-full">
              <img 
                src={photo} 
                alt="Shift start" 
                className="w-full h-48 object-cover rounded-md border" 
              />
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleCameraView}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPhoto(null)}
                >
                  Reset
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <Button 
                variant="outline" 
                onClick={toggleCameraView} 
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
              
              {cameraError && (
                <p className="text-red-500 text-xs mt-1">
                  {cameraError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
