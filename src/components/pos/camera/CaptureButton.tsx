
import { Button } from "@/components/ui/button";

interface CaptureButtonProps {
  onClick: () => void;
}

export default function CaptureButton({ onClick }: CaptureButtonProps) {
  return (
    <Button 
      onClick={onClick}
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 shadow-lg"
      size="lg"
    >
      Capture
    </Button>
  );
}
