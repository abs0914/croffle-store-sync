
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";

interface ShiftCameraProps {
  onCapture: (photoUrl: string | null) => void;
  onReset?: () => void;
}

export default function ShiftCamera({ onCapture, onReset }: ShiftCameraProps) {
  const { currentStore } = useStore();
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing streams first
      stopCamera();
      
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error("Error playing video:", err);
            });
          }
        };
        mediaStreamRef.current = stream;
      }
      
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
  }, []);

  const capturePhoto = useCallback(() => {
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
    } else {
      console.error('Video or canvas not properly initialized');
      toast.error('Could not capture photo, please try again');
    }
  }, [currentStore, stopCamera, onCapture]);

  const resetPhoto = () => {
    setPhoto(null);
    onCapture(null);
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className="space-y-2">
      <Label>Capture Photo (Optional)</Label>
      {showCamera ? (
        <div className="relative">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-48 object-cover rounded-md"
          />
          <Button 
            onClick={capturePhoto}
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
          >
            Capture
          </Button>
        </div>
      ) : photo ? (
        <div className="relative">
          <img 
            src={photo} 
            alt="Captured photo" 
            className="w-full h-48 object-cover rounded-md" 
          />
          <Button 
            onClick={() => { resetPhoto(); startCamera(); }} 
            variant="outline" 
            size="sm"
            className="absolute bottom-2 right-2"
          >
            Retake
          </Button>
        </div>
      ) : (
        <Button onClick={startCamera} variant="outline" className="w-full">
          <Camera className="mr-2 h-4 w-4" />
          Take Photo
        </Button>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
