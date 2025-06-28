
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/commissary";

interface ConversionInputItemsProps {
  inputItems: { commissary_item_id: string; quantity: number; unit: string }[];
  setInputItems: (items: { commissary_item_id: string; quantity: number; unit: string }[]) => void;
  rawMaterials: CommissaryInventoryItem[];
}

export function ConversionInputItems({
  inputItems,
  setInputItems,
  rawMaterials
}: ConversionInputItemsProps) {
  const addInputItem = () => {
    setInputItems([...inputItems, { commissary_item_id: "", quantity: 1, unit: "pieces" }]);
  };

  const removeInputItem = (index: number) => {
    if (inputItems.length > 1) {
      setInputItems(inputItems.filter((_, i) => i !== index));
    }
  };

  const updateInputItem = (index: number, field: string, value: any) => {
    const updated = [...inputItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-update unit when raw material is selected
    if (field === 'commissary_item_id') {
      const selectedMaterial = rawMaterials.find(rm => rm.id === value);
      if (selectedMaterial) {
        updated[index].unit = selectedMaterial.uom;
      }
    }
    
    setInputItems(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Input Items (Raw Materials)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addInputItem}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>
      
      {inputItems.map((item, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <Select
            value={item.commissary_item_id}
            onValueChange={(value) => updateInputItem(index, 'commissary_item_id', value)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select raw material" />
            </SelectTrigger>
            <SelectContent>
              {rawMaterials.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.name} (Stock: {material.current_stock} {material.uom})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={item.quantity}
            onChange={(e) => updateInputItem(index, 'quantity', parseFloat(e.target.value) || 0)}
            className="w-24"
            placeholder="Qty"
          />
          
          <Input
            value={item.unit}
            onChange={(e) => updateInputItem(index, 'unit', e.target.value)}
            className="w-20"
            placeholder="Unit"
            readOnly
          />
          
          {inputItems.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => removeInputItem(index)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
