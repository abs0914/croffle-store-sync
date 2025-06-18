
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

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
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button 
        onClick={onSubmit} 
        disabled={!canSubmit || isSubmitting}
        className="flex items-center"
      >
        {isSubmitting ? (
          <>Submitting...</>
        ) : (
          <>
            <Camera className="mr-2 h-4 w-4" />
            Start Shift with Photo
          </>
        )}
      </Button>
    </DialogFooter>
  );
}
