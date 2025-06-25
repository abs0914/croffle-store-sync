
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

// Define business-relevant categories for finished products
const FINISHED_PRODUCT_CATEGORIES = [
  { value: 'regular_croissants', label: 'Regular Croissants' },
  { value: 'flavored_croissants', label: 'Flavored Croissants' },
  { value: 'sauces', label: 'Sauces' },
  { value: 'toppings', label: 'Toppings' },
  { value: 'packaging', label: 'Boxes & Packaging' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
];

export function ConversionOutputItem({ outputItem, setOutputItem }: ConversionOutputItemProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Output Item (Finished Product)</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="output-name">Product Name *</Label>
          <Input
            id="output-name"
            value={outputItem.name}
            onChange={(e) => setOutputItem(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Regular Croissant + Whipped Cream"
          />
        </div>
        
        <div>
          <Label htmlFor="output-category">Product Category *</Label>
          <Select 
            value={outputItem.category} 
            onValueChange={(value) => setOutputItem(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {FINISHED_PRODUCT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="output-quantity">Quantity Produced *</Label>
          <Input
            id="output-quantity"
            type="number"
            min="1"
            value={outputItem.quantity}
            onChange={(e) => setOutputItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>
        
        <div>
          <Label htmlFor="output-uom">Unit of Measure *</Label>
          <Select 
            value={outputItem.uom} 
            onValueChange={(value) => setOutputItem(prev => ({ ...prev, uom: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {STANDARD_UOM_OPTIONS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="output-cost">Unit Cost (₱)</Label>
          <Input
            id="output-cost"
            type="number"
            step="0.01"
            min="0"
            value={outputItem.unit_cost}
            onChange={(e) => setOutputItem(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
            placeholder="Cost per unit"
          />
        </div>
        
        <div>
          <Label htmlFor="output-sku">SKU</Label>
          <Input
            id="output-sku"
            value={outputItem.sku}
            onChange={(e) => setOutputItem(prev => ({ ...prev, sku: e.target.value }))}
            placeholder="Product SKU"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="storage-location">Storage Location</Label>
        <Input
          id="storage-location"
          value={outputItem.storage_location}
          onChange={(e) => setOutputItem(prev => ({ ...prev, storage_location: e.target.value }))}
          placeholder="Where this product will be stored"
        />
      </div>
    </div>
  );
}
