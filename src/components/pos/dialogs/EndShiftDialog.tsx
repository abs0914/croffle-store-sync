
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
import { Shift } from "@/types";

interface EndShiftDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentShift: Shift | null;
  onEndShift: (endingCash: number, photo?: string) => Promise<void>;
}

export default function EndShiftDialog({
  isOpen,
  onOpenChange,
  currentShift,
  onEndShift
}: EndShiftDialogProps) {
  const [endingCash, setEndingCash] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setEndingCash(0);
      setPhoto(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!currentShift) return;
    await onEndShift(endingCash, photo || undefined);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End Current Shift</DialogTitle>
          <DialogDescription>
            Please count your cash drawer and enter the ending amount.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="endingCash">Ending Cash Amount</Label>
            <Input
              id="endingCash"
              type="number"
              value={endingCash || ''}
              onChange={(e) => setEndingCash(Number(e.target.value))}
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
            End Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
