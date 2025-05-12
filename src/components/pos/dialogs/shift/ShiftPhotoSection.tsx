
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
import ShiftCamera from "../../camera/ShiftCamera";

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
  const toggleCameraView = () => {
    setShowCameraView(!showCameraView);
  };

  return (
    <div className="space-y-2">
      <Label>Shift Photo</Label>
      {showCameraView ? (
        <div className="border rounded-md p-2 bg-muted/10">
          <ShiftCamera 
            onCapture={(capturedPhoto) => {
              setPhoto(capturedPhoto);
              setShowCameraView(false);
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
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2" 
                onClick={() => setPhoto(null)}
              >
                Reset
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={toggleCameraView} 
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
