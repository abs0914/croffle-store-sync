
import { useCallback } from "react";

interface UseCameraCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  setPhoto: (photo: string | null) => void;
  stopCamera: () => void;
}

export function useCameraCapture({
  videoRef,
  canvasRef,
  setPhoto,
  stopCamera
}: UseCameraCaptureProps) {
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
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(dataUrl);
        stopCamera();
        return dataUrl;
      }
    }
    console.log("Video not ready for capture");
    return null;
  }, [videoRef, canvasRef, setPhoto, stopCamera]);
  
  return { capturePhoto };
}
