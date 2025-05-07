
import { useState } from "react";
import { Ingredient } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface StockAdjustmentModalProps {
  ingredient: Ingredient;
  onSave: (id: string, quantity: number, type: string, notes: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const StockAdjustmentModal = ({ 
  ingredient, 
  onSave, 
  onCancel,
  isLoading 
}: StockAdjustmentModalProps) => {
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: ingredient.stock_quantity,
    type: "adjustment",
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
      ingredient.id, 
      stockAdjustment.quantity, 
      stockAdjustment.type, 
      stockAdjustment.notes
    );
  };

  const getNewStockQuantity = () => {
    if (stockAdjustment.type === 'adjustment') {
      return stockAdjustment.quantity;
    } else if (stockAdjustment.type === 'purchase') {
      return Number(ingredient.stock_quantity) + Number(stockAdjustment.quantity);
    } else {
      return Math.max(0, Number(ingredient.stock_quantity) - Number(stockAdjustment.quantity));
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update Stock - {ingredient.name}</DialogTitle>
        <DialogDescription>
          Update the stock quantity of this inventory item.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock-type" className="text-right">
            Update Type
          </Label>
          <Select 
            value={stockAdjustment.type} 
            onValueChange={(value) => handleChange("type", value)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="adjustment">Set Exact Quantity</SelectItem>
              <SelectItem value="purchase">Add to Stock</SelectItem>
              <SelectItem value="sale">Remove from Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock-quantity" className="text-right">
            {stockAdjustment.type === 'adjustment' ? 'New Quantity' : 'Quantity to Change'}
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
          <Input
            id="stock-notes"
            value={stockAdjustment.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            className="col-span-3"
            placeholder="Optional notes about this change"
          />
        </div>

        {stockAdjustment.type !== 'adjustment' && (
          <div className="col-span-4 text-center">
            <p>
              Current Stock: <strong>{ingredient.stock_quantity}</strong> {ingredient.unit_type}
            </p>
            <p className="mt-2">
              New Stock After Change: <strong>{getNewStockQuantity()}</strong> {ingredient.unit_type}
            </p>
          </div>
        )}
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
