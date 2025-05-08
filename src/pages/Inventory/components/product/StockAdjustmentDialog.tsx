
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StockAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stockAdjustment: {
    quantity: number;
    notes: string;
    type: string;
  };
  handleStockAdjustmentInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSaveStockAdjustment: () => Promise<void>;
  setStockAdjustmentType: (value: string) => void;
}

export const StockAdjustmentDialog = ({
  isOpen,
  onClose,
  stockAdjustment,
  handleStockAdjustmentInputChange,
  handleSaveStockAdjustment,
  setStockAdjustmentType
}: StockAdjustmentDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Update the stock quantity for this product.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="adjustment_type">Adjustment Type</Label>
            <Select
              value={stockAdjustment.type}
              onValueChange={setStockAdjustmentType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock</SelectItem>
                <SelectItem value="remove">Remove Stock</SelectItem>
                <SelectItem value="adjustment">Set Exact Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustment_quantity">Quantity</Label>
            <Input
              id="adjustment_quantity"
              name="quantity"
              type="number"
              value={stockAdjustment.quantity}
              onChange={handleStockAdjustmentInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjustment_notes">Notes</Label>
            <Textarea
              id="adjustment_notes"
              name="notes"
              value={stockAdjustment.notes}
              onChange={handleStockAdjustmentInputChange}
              placeholder="Optional notes about this adjustment"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveStockAdjustment}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
