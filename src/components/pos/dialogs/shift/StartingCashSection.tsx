
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

interface StartingCashSectionProps {
  startingCash: number;
  setStartingCash: (cash: number) => void;
  previousEndingCash: number | null;
  isLoading: boolean;
}

export default function StartingCashSection({
  startingCash,
  setStartingCash,
  previousEndingCash,
  isLoading
}: StartingCashSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="startingCash">
        Starting Cash Amount 
        {previousEndingCash !== null && (
          <span className="text-sm text-muted-foreground ml-2">
            (Previous ending cash: {previousEndingCash.toFixed(2)})
          </span>
        )}
      </Label>
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Spinner className="h-4 w-4" />
          <span className="text-sm">Loading previous cash amount...</span>
        </div>
      ) : (
        <Input
          id="startingCash"
          type="number"
          value={startingCash || ''}
          onChange={(e) => setStartingCash(Number(e.target.value))}
          placeholder="0.00"
        />
      )}
    </div>
  );
}
