
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

interface EditIngredientFormProps {
  ingredient: Ingredient;
  onUpdate: (updatedIngredient: Ingredient) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const EditIngredientForm = ({ 
  ingredient, 
  onUpdate, 
  onCancel,
  isLoading 
}: EditIngredientFormProps) => {
  const handleChange = (field: keyof Ingredient, value: any) => {
    onUpdate({
      ...ingredient,
      [field]: value
    });
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
          <Label htmlFor="edit-name" className="text-right">
            Name
          </Label>
          <Input
            id="edit-name"
            value={ingredient.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-unit_type" className="text-right">
            Unit Type
          </Label>
          <Select 
            value={ingredient.unit_type} 
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
          <Label htmlFor="edit-cost" className="text-right">
            Cost Per Unit
          </Label>
          <Input
            id="edit-cost"
            type="number"
            value={ingredient.cost_per_unit || 0}
            onChange={(e) => handleChange("cost_per_unit", Number(e.target.value))}
            className="col-span-3"
            min="0"
            step="0.01"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-status" className="text-right">
            Status
          </Label>
          <Select 
            value={ingredient.is_active ? "active" : "inactive"} 
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
          onClick={() => onUpdate(ingredient)}
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
