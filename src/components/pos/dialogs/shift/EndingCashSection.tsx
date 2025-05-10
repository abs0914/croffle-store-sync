
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Shift } from "@/types";

interface EndingCashSectionProps {
  endingCash: number;
  setEndingCash: (cash: number) => void;
  currentShift: Shift | null;
  cashError: string | null;
}

export default function EndingCashSection({
  endingCash,
  setEndingCash,
  currentShift,
  cashError
}: EndingCashSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="endingCash">
        Ending Cash Amount
        {currentShift && (
          <span className="text-sm text-muted-foreground ml-2">
            (Starting cash: {currentShift.startingCash.toFixed(2)})
          </span>
        )}
      </Label>
      <Input
        id="endingCash"
        type="number"
        value={endingCash || ''}
        onChange={(e) => setEndingCash(Number(e.target.value))}
        placeholder="0.00"
        className={cashError ? "border-red-500" : ""}
      />
      
      {cashError && (
        <Alert variant="destructive" className="py-2 mt-1">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{cashError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
