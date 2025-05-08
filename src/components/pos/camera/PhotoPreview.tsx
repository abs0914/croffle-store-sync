
import { Button } from "@/components/ui/button";

interface PhotoPreviewProps {
  photoUrl: string;
  onReset: () => void;
}

export default function PhotoPreview({ photoUrl, onReset }: PhotoPreviewProps) {
  return (
    <div className="relative">
      <img 
        src={photoUrl} 
        alt="Captured photo" 
        className="w-full h-48 object-cover rounded-md" 
      />
      <Button 
        onClick={onReset}
        variant="outline" 
        size="sm"
        className="absolute bottom-2 right-2"
      >
        Retake
      </Button>
    </div>
  );
}
