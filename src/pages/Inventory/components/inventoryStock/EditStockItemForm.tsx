
import { InventoryStock } from "@/types";
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
  const handleChange = (field: keyof InventoryStock, value: any) => {
    onUpdate({
      ...stockItem,
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
          <Label htmlFor="edit-item" className="text-right">
            Item
          </Label>
          <Input
            id="edit-item"
            value={stockItem.item}
            onChange={(e) => handleChange("item", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-unit" className="text-right">
            Unit
          </Label>
          <Input
            id="edit-unit"
            value={stockItem.unit}
            onChange={(e) => handleChange("unit", e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-status" className="text-right">
            Status
          </Label>
          <Select 
            value={stockItem.is_active ? "active" : "inactive"} 
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
          onClick={() => onUpdate(stockItem)}
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
