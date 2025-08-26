
import { useState, useEffect } from "react";
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

interface EditStockItemFormProps {
  stockItem: InventoryStock;
  onUpdate: (updatedStockItem: InventoryStock) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const EditStockItemForm = ({ 
  stockItem, 
  onUpdate, 
  onCancel,
  isLoading 
}: EditStockItemFormProps) => {
  const [formData, setFormData] = useState<InventoryStock>(stockItem);

  // Update form data when stockItem prop changes
  useEffect(() => {
    setFormData(stockItem);
  }, [stockItem]);

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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Inventory Item</DialogTitle>
        <DialogDescription>
          Update the details of this inventory item.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-item" className="text-right">
            Item
          </Label>
          <Input
            id="edit-item"
            value={formData.item}
            onChange={(e) => handleChange("item", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-category" className="text-right">
            Category
          </Label>
          <Select
            value={formData.item_category || 'base_ingredient'}
            onValueChange={(value) => handleChange("item_category", value as InventoryItemCategory)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue />
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
          <Label htmlFor="edit-unit" className="text-right">
            Unit
          </Label>
          <Input
            id="edit-unit"
            value={formData.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-cost" className="text-right">
            Unit Cost (₱)
          </Label>
          <Input
            id="edit-cost"
            type="number"
            step="0.01"
            value={formData.cost || 0}
            onChange={(e) => handleChange("cost", parseFloat(e.target.value) || 0)}
            className="col-span-3"
            min="0"
            placeholder="0.00"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-status" className="text-right">
            Status
          </Label>
          <Select 
            value={formData.is_active ? "active" : "inactive"} 
            onValueChange={(value) => handleChange("is_active", value === "active")}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isLoading}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          {isLoading ? <Spinner className="mr-2" /> : null}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
