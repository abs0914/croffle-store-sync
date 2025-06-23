
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STANDARD_UOM_OPTIONS } from "@/types/commissary";

interface ConversionOutputItemProps {
  outputItem: {
    name: string;
    category: 'raw_materials' | 'packaging_materials' | 'supplies';
    uom: string;
    quantity: number;
    unit_cost: number;
    sku: string;
    storage_location: string;
  };
  setOutputItem: (item: any) => void;
}

export function ConversionOutputItem({
  outputItem,
  setOutputItem
}: ConversionOutputItemProps) {
  return (
    <div>
      <Label className="mb-2 block">Output Item (Finished Good)</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="output-name">Item Name</Label>
          <Input
            id="output-name"
            value={outputItem.name}
            onChange={(e) => setOutputItem({ ...outputItem, name: e.target.value })}
            placeholder="e.g., Croissant"
          />
        </div>
        
        <div>
          <Label htmlFor="output-category">Category</Label>
          <Select
            value={outputItem.category}
            onValueChange={(value: any) => setOutputItem({ ...outputItem, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw_materials">Raw Materials</SelectItem>
              <SelectItem value="packaging_materials">Packaging Materials</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="output-uom">Unit of Measure</Label>
          <Select
            value={outputItem.uom}
            onValueChange={(value) => setOutputItem({ ...outputItem, uom: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select UOM" />
            </SelectTrigger>
            <SelectContent>
              {STANDARD_UOM_OPTIONS.map((uom) => (
                <SelectItem key={uom} value={uom}>
                  {uom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="output-quantity">Quantity</Label>
          <Input
            id="output-quantity"
            type="number"
            min="0.01"
            step="0.01"
            value={outputItem.quantity}
            onChange={(e) => setOutputItem({ ...outputItem, quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <Label htmlFor="output-cost">Unit Cost (Optional)</Label>
          <Input
            id="output-cost"
            type="number"
            min="0"
            step="0.01"
            value={outputItem.unit_cost}
            onChange={(e) => setOutputItem({ ...outputItem, unit_cost: parseFloat(e.target.value) || 0 })}
          />
        </div>
        
        <div>
          <Label htmlFor="output-sku">SKU (Optional)</Label>
          <Input
            id="output-sku"
            value={outputItem.sku}
            onChange={(e) => setOutputItem({ ...outputItem, sku: e.target.value })}
            placeholder="Product SKU"
          />
        </div>
        
        <div>
          <Label htmlFor="output-location">Storage Location (Optional)</Label>
          <Input
            id="output-location"
            value={outputItem.storage_location}
            onChange={(e) => setOutputItem({ ...outputItem, storage_location: e.target.value })}
            placeholder="Storage location"
          />
        </div>
      </div>
    </div>
  );
}
