
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Camera, DollarSign } from "lucide-react";

interface StartShiftDialogFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}

export default function StartShiftDialogFooter({
  onCancel,
  onSubmit,
  isSubmitting,
  canSubmit
}: StartShiftDialogFooterProps) {
  return (
    <DialogFooter className="gap-2">
      <Button 
        variant="outline" 
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button 
        onClick={onSubmit} 
        disabled={!canSubmit || isSubmitting}
        className="flex items-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4" />
            <Camera className="w-4 h-4" />
            Start Shift
          </>
        )}
      </Button>
    </DialogFooter>
  );
}
