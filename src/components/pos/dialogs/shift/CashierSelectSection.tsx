
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cashier } from "@/types/cashier";

interface CashierSelectSectionProps {
  cashiers: Cashier[];
  selectedCashierId: string | null;
  setSelectedCashierId: (id: string | null) => void;
  isLoading: boolean;
}

export default function CashierSelectSection({
  cashiers,
  selectedCashierId,
  setSelectedCashierId,
  isLoading
}: CashierSelectSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="cashier">
        Select Cashier
      </Label>
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Spinner className="h-4 w-4" />
          <span className="text-sm">Loading cashiers...</span>
        </div>
      ) : cashiers.length > 0 ? (
        <Select
          value={selectedCashierId || ''}
          onValueChange={(value) => setSelectedCashierId(value)}
        >
          <SelectTrigger id="cashier" className="w-full">
            <SelectValue placeholder="Select a cashier" />
          </SelectTrigger>
          <SelectContent>
            {cashiers.map((cashier) => (
              <SelectItem key={cashier.id} value={cashier.id}>
                {cashier.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="text-sm text-amber-600">
          No active cashiers found. Please add cashiers to your store in the settings.
        </div>
      )}
    </div>
  );
}
