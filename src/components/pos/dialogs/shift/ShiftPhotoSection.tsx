
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, CameraOff, RefreshCcw } from "lucide-react";
import ShiftCamera from "../../camera/ShiftCamera";
import { useState, useEffect, useRef } from "react";

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
  const [isStable, setIsStable] = useState(false);
  const initialRenderRef = useRef(true);
  const showCameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountCountRef = useRef(0);
  
  // Mark component as stable after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStable(true);
      console.log("[ShiftPhotoSection] Component marked as stable");
    }, 500); // Increased from 300ms to 500ms
    
    mountCountRef.current += 1;
    console.log(`[ShiftPhotoSection] Mounting count: ${mountCountRef.current}`);
    
    return () => {
      clearTimeout(timer);
      if (showCameraTimerRef.current) {
        clearTimeout(showCameraTimerRef.current);
        showCameraTimerRef.current = null;
      }
    };
  }, []);
  
  // Automatically show camera when component mounts, but with a longer delay
  useEffect(() => {
    if (!photo && isStable) {
      // Only auto-show camera on initial render
      if (initialRenderRef.current) {
        console.log("[ShiftPhotoSection] Auto-showing camera after stability delay");
        initialRenderRef.current = false;
        
        // Delay showing camera to ensure component is stable
        showCameraTimerRef.current = setTimeout(() => {
          setShowCameraView(true);
          showCameraTimerRef.current = null;
        }, 800); // Increased from 500ms to 800ms
        
        return () => {
          if (showCameraTimerRef.current) {
            clearTimeout(showCameraTimerRef.current);
            showCameraTimerRef.current = null;
          }
        };
      }
    }
    
    // Clean up function - hide camera when component unmounts
    return () => {
      if (showCameraTimerRef.current) {
        clearTimeout(showCameraTimerRef.current);
        showCameraTimerRef.current = null;
      }
      console.log("[ShiftPhotoSection] Component unmounting, hiding camera");
      setShowCameraView(false);
    };
  }, [setShowCameraView, photo, isStable]);

  const handleCameraError = (message: string) => {
    setCameraError(message);
  };

  const showCamera = () => {
    console.log("[ShiftPhotoSection] Manual camera trigger clicked");
    setCameraError(null);
    
    // Add delay before showing camera
    showCameraTimerRef.current = setTimeout(() => {
      setShowCameraView(true);
      showCameraTimerRef.current = null;
    }, 500);
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
                setCameraError(null);
              } else {
                handleCameraError("Failed to capture photo");
              }
            }}
            onReset={() => {
              setShowCameraView(false);
              setCameraError(null);
            }}
          />
          
          <div className="mt-2 flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log("[ShiftPhotoSection] Manually hiding camera view");
                setShowCameraView(false);
              }}
            >
              <CameraOff className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          {photo ? (
            <div className="relative w-full">
              <img 
                src={photo} 
                alt="Shift photo" 
                className="w-full h-48 object-cover rounded-md border" 
              />
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={showCamera}
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
                onClick={showCamera}
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
              
              {cameraError && (
                <div className="text-red-500 text-xs mt-1 flex items-center justify-center gap-2">
                  <span>{cameraError}</span>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-xs p-0 h-auto" 
                    onClick={showCamera}
                  >
                    <RefreshCcw className="mr-1 h-3 w-3" />
                    <span>Retry</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
