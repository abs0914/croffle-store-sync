
import { useState } from "react";
import { InventoryStock } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Plus } from "lucide-react";

interface AddStockItemFormProps {
  onSave: (stockItem: Partial<InventoryStock>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const AddStockItemForm = ({ onSave, onCancel, isLoading }: AddStockItemFormProps) => {
  const [newStockItem, setNewStockItem] = useState<Partial<InventoryStock>>({
    item: "",
    unit: "",
    stock_quantity: 0,
    is_active: true
  });

  const handleChange = (field: keyof InventoryStock, value: any) => {
    setNewStockItem(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(newStockItem);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add New Inventory Item</DialogTitle>
        <DialogDescription>
          Add a new item to your inventory.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="item" className="text-right">
            Item
          </Label>
          <Input
            id="item"
            value={newStockItem.item}
            onChange={(e) => handleChange("item", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="unit" className="text-right">
            Unit
          </Label>
          <Input
            id="unit"
            value={newStockItem.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
            className="col-span-3"
            placeholder="e.g., pieces, kg, liters"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock_quantity" className="text-right">
            Initial Stock
          </Label>
          <Input
            id="stock_quantity"
            type="number"
            value={newStockItem.stock_quantity || 0}
            onChange={(e) => handleChange("stock_quantity", Number(e.target.value))}
            className="col-span-3"
            min="0"
          />
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
          {isLoading ? <Spinner className="mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
          Add Inventory Item
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
