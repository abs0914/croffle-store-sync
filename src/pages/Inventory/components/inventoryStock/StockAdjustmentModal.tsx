
import { useState } from "react";
import { InventoryStock } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface StockAdjustmentModalProps {
  stockItem: InventoryStock;
  onSave: (id: string, quantity: number, notes?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const StockAdjustmentModal = ({ 
  stockItem, 
  onSave, 
  onCancel,
  isLoading 
}: StockAdjustmentModalProps) => {
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: stockItem.stock_quantity,
    notes: ""
  });

  const handleChange = (field: string, value: any) => {
    setStockAdjustment({
      ...stockAdjustment,
      [field]: value
    });
  };

  const handleSubmit = () => {
    onSave(
      stockItem.id, 
      stockAdjustment.quantity, 
      stockAdjustment.notes
    );
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update Stock - {stockItem.item}</DialogTitle>
        <DialogDescription>
          Update the stock quantity of this inventory item.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock-quantity" className="text-right">
            New Quantity
          </Label>
          <Input
            id="stock-quantity"
            type="number"
            value={stockAdjustment.quantity}
            onChange={(e) => handleChange("quantity", Number(e.target.value))}
            className="col-span-3"
            min="0"
          />
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock-notes" className="text-right">
            Notes
          </Label>
          <Textarea
            id="stock-notes"
            value={stockAdjustment.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="col-span-3"
            placeholder="Optional notes about this change"
          />
        </div>

        <div className="col-span-4 text-center">
          <p>
            Current Stock: <strong>{stockItem.stock_quantity}</strong> {stockItem.unit}
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isLoading}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          {isLoading ? <Spinner className="mr-2" /> : null}
          Update Stock
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
