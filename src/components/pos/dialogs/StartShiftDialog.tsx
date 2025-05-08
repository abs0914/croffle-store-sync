
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import ShiftCamera from "../camera/ShiftCamera";

interface StartShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStartShift: (startingCash: number, photo?: string) => Promise<void>;
}

export default function StartShiftDialog({
  isOpen,
  onOpenChange,
  onStartShift
}: StartShiftDialogProps) {
  const [startingCash, setStartingCash] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStartingCash(0);
      setPhoto(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    await onStartShift(startingCash, photo || undefined);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer and enter the starting amount.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="startingCash">Starting Cash Amount</Label>
            <Input
              id="startingCash"
              type="number"
              value={startingCash || ''}
              onChange={(e) => setStartingCash(Number(e.target.value))}
              placeholder="0.00"
              className="col-span-3"
            />
          </div>
          
          <ShiftCamera onCapture={setPhoto} />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Start Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
