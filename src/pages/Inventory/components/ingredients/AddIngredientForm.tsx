
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
import { Plus } from "lucide-react";

interface AddIngredientFormProps {
  onSave: (ingredient: Partial<Ingredient>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const AddIngredientForm = ({ onSave, onCancel, isLoading }: AddIngredientFormProps) => {
  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    name: "",
    unit_type: "pieces",
    stock_quantity: 0,
    cost_per_unit: 0,
    is_active: true
  });

  const handleChange = (field: keyof Ingredient, value: any) => {
    setNewIngredient(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(newIngredient);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add New Inventory Item</DialogTitle>
        <DialogDescription>
          Add a new inventory item to your inventory.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={newIngredient.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="unit_type" className="text-right">
            Unit Type
          </Label>
          <Select 
            value={newIngredient.unit_type} 
            onValueChange={(value) => handleChange("unit_type", value)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select unit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pieces">Pieces</SelectItem>
              <SelectItem value="portion">Portion</SelectItem>
              <SelectItem value="serving">Serving</SelectItem>
              <SelectItem value="scoop">Scoop</SelectItem>
              <SelectItem value="grams">Grams</SelectItem>
              <SelectItem value="milliliters">Milliliters</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="stock_quantity" className="text-right">
            Initial Stock
          </Label>
          <Input
            id="stock_quantity"
            type="number"
            value={newIngredient.stock_quantity || 0}
            onChange={(e) => handleChange("stock_quantity", Number(e.target.value))}
            className="col-span-3"
            min="0"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="cost" className="text-right">
            Cost Per Unit
          </Label>
          <Input
            id="cost"
            type="number"
            value={newIngredient.cost_per_unit || 0}
            onChange={(e) => handleChange("cost_per_unit", Number(e.target.value))}
            className="col-span-3"
            min="0"
            step="0.01"
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
