
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package, RefreshCw, Plus, Minus } from "lucide-react";
import { CommissaryInventoryItem, ConversionRequest, STANDARD_UOM_OPTIONS } from "@/types/commissary";
import { executeConversion, fetchConversionHistory, fetchAvailableRawMaterials } from "@/services/conversion";
import { toast } from "sonner";

export function ConversionProcessTab() {
  const [rawMaterials, setRawMaterials] = useState<CommissaryInventoryItem[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  // Form state
  const [conversionName, setConversionName] = useState("");
  const [description, setDescription] = useState("");
  const [inputItems, setInputItems] = useState<{ commissary_item_id: string; quantity: number }[]>([
    { commissary_item_id: "", quantity: 1 }
  ]);
  const [outputItem, setOutputItem] = useState({
    name: "",
    category: "raw_materials" as const,
    uom: "",
    quantity: 1,
    unit_cost: 0,
    sku: "",
    storage_location: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [materialsData, conversionsData] = await Promise.all([
      fetchAvailableRawMaterials(),
      fetchConversionHistory()
    ]);
    setRawMaterials(materialsData);
    setConversions(conversionsData);
    setLoading(false);
  };

  const addInputItem = () => {
    setInputItems([...inputItems, { commissary_item_id: "", quantity: 1 }]);
  };

  const removeInputItem = (index: number) => {
    if (inputItems.length > 1) {
      setInputItems(inputItems.filter((_, i) => i !== index));
    }
  };

  const updateInputItem = (index: number, field: string, value: any) => {
    const updated = [...inputItems];
    updated[index] = { ...updated[index], [field]: value };
    setInputItems(updated);
  };

  const resetForm = () => {
    setConversionName("");
    setDescription("");
    setInputItems([{ commissary_item_id: "", quantity: 1 }]);
    setOutputItem({
      name: "",
      category: "raw_materials",
      uom: "",
      quantity: 1,
      unit_cost: 0,
      sku: "",
      storage_location: ""
    });
  };

  const handleConversion = async () => {
    if (!conversionName.trim()) {
      toast.error("Please enter a conversion name");
      return;
    }

    if (!outputItem.name.trim()) {
      toast.error("Please enter an output item name");
      return;
    }

    if (!outputItem.uom) {
      toast.error("Please select a unit of measure for the output item");
      return;
    }

    const validInputItems = inputItems.filter(item => 
      item.commissary_item_id && item.quantity > 0
    );

    if (validInputItems.length === 0) {
      toast.error("Please select at least one input item with valid quantity");
      return;
    }

    const conversionRequest: ConversionRequest = {
      name: conversionName,
      description,
      input_items: validInputItems,
      output_item: outputItem
    };

    setConverting(true);
    const success = await executeConversion(conversionRequest);
    
    if (success) {
      await loadData();
      resetForm();
    }
    
    setConverting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conversion Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Conversion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="conversion-name">Conversion Name</Label>
              <Input
                id="conversion-name"
                value={conversionName}
                onChange={(e) => setConversionName(e.target.value)}
                placeholder="e.g., Croissant Box to Individual Croissants"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the conversion"
              />
            </div>
          </div>

          {/* Input Items */}
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

          {/* Output Item */}
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

          {/* Action Button */}
          <Button
            onClick={handleConversion}
            disabled={converting}
            className="w-full"
          >
            {converting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Execute Conversion
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversions</CardTitle>
        </CardHeader>
        <CardContent>
          {conversions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conversions have been performed yet.
            </div>
          ) : (
            <div className="space-y-4">
              {conversions.slice(0, 10).map((conversion) => (
                <div key={conversion.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      {new Date(conversion.conversion_date).toLocaleDateString()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {conversion.finished_goods_quantity} units produced
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span>
                      {conversion.conversion_ingredients?.length || 0} raw materials
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="font-medium">
                      {conversion.commissary_item?.name || 'Output Item'}
                    </span>
                  </div>
                  
                  {conversion.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      {conversion.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
