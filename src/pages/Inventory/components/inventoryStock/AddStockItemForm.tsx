
import { useState } from "react";
import { InventoryStock, InventoryItemCategory } from "@/types/inventory";
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
    cost: 0,
    is_active: true,
    item_category: 'base_ingredient'
  });

  const categoryOptions: { value: InventoryItemCategory; label: string }[] = [
    { value: 'base_ingredient', label: 'Base Ingredient' },
    { value: 'classic_sauce', label: 'Classic Sauce' },
    { value: 'premium_sauce', label: 'Premium Sauce' },
    { value: 'classic_topping', label: 'Classic Topping' },
    { value: 'premium_topping', label: 'Premium Topping' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'biscuit', label: 'Biscuit' }
  ];

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
          <Label htmlFor="category" className="text-right">
            Category
          </Label>
          <Select
            value={newStockItem.item_category}
            onValueChange={(value) => handleChange("item_category", value as InventoryItemCategory)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            step="0.01"
            value={newStockItem.stock_quantity || 0}
            onChange={(e) => handleChange("stock_quantity", parseFloat(e.target.value) || 0)}
            className="col-span-3"
            min="0"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="cost" className="text-right">
            Unit Cost (₱)
          </Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={newStockItem.cost || 0}
            onChange={(e) => handleChange("cost", parseFloat(e.target.value) || 0)}
            className="col-span-3"
            min="0"
            placeholder="0.00"
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
