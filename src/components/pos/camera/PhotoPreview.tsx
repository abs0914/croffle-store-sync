
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface PhotoPreviewProps {
  photoUrl: string;
  onReset: () => void;
}

export default function PhotoPreview({ photoUrl, onReset }: PhotoPreviewProps) {
  return (
    <div className="relative h-full w-full">
      <img 
        src={photoUrl} 
        alt="Captured photo" 
        className="w-full h-full object-cover rounded-md" 
      />
      <Button 
        onClick={onReset}
        variant="outline" 
        size="sm"
        className="absolute bottom-2 right-2 bg-white/70 hover:bg-white"
      >
        <Camera className="h-4 w-4 mr-1" />
        Retake
      </Button>
    </div>
  );
}
