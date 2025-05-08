import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { format } from "date-fns";
import { useStore } from "@/contexts/StoreContext";
import { useCamera } from "@/hooks/useCamera";
import TimestampOverlay from "./TimestampOverlay";
import CaptureButton from "./CaptureButton";
import PhotoPreview from "./PhotoPreview";

interface ShiftCameraProps {
  onCapture: (photoUrl: string | null) => void;
  onReset?: () => void;
}

export default function ShiftCamera({ onCapture, onReset }: ShiftCameraProps) {
  const { currentStore } = useStore();
  const { 
    videoRef,
    canvasRef,
    showCamera,
    photo,
    setPhoto,
    startCamera,
    stopCamera,
    logVideoState
  } = useCamera();
  
  // Start camera automatically when component mounts
  useEffect(() => {
    startCamera();
  }, [startCamera]);
  
  // Log video state when camera is shown
  useEffect(() => {
    if (showCamera) {
      logVideoState();
    }
  }, [showCamera, logVideoState]);
  
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw timestamp on the photo
        const now = new Date();
        const timestamp = format(now, "yyyy-MM-dd HH:mm:ss");
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'right';
        ctx.fillText(timestamp, canvas.width - 10, canvas.height - 10);
        if (currentStore) {
          ctx.textAlign = 'left';
          ctx.fillText(currentStore.name, 10, canvas.height - 10);
        }
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(dataUrl);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };
  
  const resetPhoto = () => {
    setPhoto(null);
    onCapture(null);
    startCamera();
    if (onReset) {
      onReset();
    }
  };
  
  return (
    <div className="space-y-2">
      <Label>Capture Photo</Label>
      {showCamera ? (
        <div className="relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-48 object-cover rounded-md border border-input bg-muted"
            onClick={() => logVideoState()}
          />
          
          <TimestampOverlay storeName={currentStore?.name} />
          <CaptureButton onClick={capturePhoto} />
        </div>
      ) : photo ? (
        <PhotoPreview photoUrl={photo} onReset={resetPhoto} />
      ) : (
        // This button should never show now, but keeping it as a fallback
        <Button onClick={startCamera} variant="outline" className="w-full">
          <Camera className="mr-2 h-4 w-4" />
          Take Photo
        </Button>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
