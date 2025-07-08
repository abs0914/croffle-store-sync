
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/format";
import { Shift } from "@/types";

interface EndingCashSectionProps {
  endingCash: number;
  setEndingCash: (amount: number) => void;
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            Starting Cash
          </Label>
          <div className="p-3 bg-muted rounded-md">
            <p className="font-medium">
              {currentShift ? formatCurrency(currentShift.startingCash) : '₱0.00'}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endingCash" className="text-base font-medium">
            Ending Cash Amount (₱) *
          </Label>
          <Input
            id="endingCash"
            type="number"
            min="0"
            step="0.01"
            value={endingCash}
            onChange={(e) => setEndingCash(parseFloat(e.target.value) || 0)}
            placeholder="Enter ending cash amount"
            className={`text-lg p-3 ${cashError ? 'border-red-500' : ''}`}
            autoFocus
          />
          {cashError && (
            <p className="text-sm text-red-500">{cashError}</p>
          )}
        </div>
      </div>
      
      <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>Instructions:</strong> Count all cash in your drawer and enter the total amount. 
          This includes bills, coins, and starting cash.
        </p>
      </div>
    </div>
  );
}
