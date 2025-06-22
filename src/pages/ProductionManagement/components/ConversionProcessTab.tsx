
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, ArrowRight, History } from "lucide-react";
import { CommissaryInventoryItem, ConversionRequest } from "@/types/commissary";
import { executeConversion, fetchConversionHistory, fetchAvailableRawMaterials } from "@/services/conversionService";
import { toast } from "sonner";

export function ConversionProcessTab() {
  const [rawMaterials, setRawMaterials] = useState<CommissaryInventoryItem[]>([]);
  const [conversionHistory, setConversionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [conversionForm, setConversionForm] = useState<ConversionRequest>({
    name: '',
    description: '',
    input_items: [],
    output_item: {
      name: '',
      category: 'raw_materials',
      uom: '',
      quantity: 0,
      unit_cost: 0,
      sku: '',
      storage_location: ''
    }
  });

  const [inputItem, setInputItem] = useState({
    commissary_item_id: '',
    quantity: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [materials, history] = await Promise.all([
        fetchAvailableRawMaterials(),
        fetchConversionHistory()
      ]);
      setRawMaterials(materials);
      setConversionHistory(history);
    } catch (error) {
      console.error('Error loading conversion data:', error);
      toast.error('Failed to load conversion data');
    } finally {
      setLoading(false);
    }
  };

  const addInputItem = () => {
    if (!inputItem.commissary_item_id || inputItem.quantity <= 0) {
      toast.error('Please select an item and enter a valid quantity');
      return;
    }

    const selectedItem = rawMaterials.find(item => item.id === inputItem.commissary_item_id);
    if (!selectedItem) {
      toast.error('Selected item not found');
      return;
    }

    if (inputItem.quantity > selectedItem.current_stock) {
      toast.error(`Insufficient stock. Available: ${selectedItem.current_stock} ${selectedItem.uom}`);
      return;
    }

    const existingIndex = conversionForm.input_items.findIndex(
      item => item.commissary_item_id === inputItem.commissary_item_id
    );

    if (existingIndex >= 0) {
      const updatedItems = [...conversionForm.input_items];
      updatedItems[existingIndex].quantity += inputItem.quantity;
      setConversionForm(prev => ({ ...prev, input_items: updatedItems }));
    } else {
      setConversionForm(prev => ({
        ...prev,
        input_items: [...prev.input_items, { ...inputItem }]
      }));
    }

    setInputItem({ commissary_item_id: '', quantity: 0 });
  };

  const removeInputItem = (index: number) => {
    setConversionForm(prev => ({
      ...prev,
      input_items: prev.input_items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!conversionForm.name || !conversionForm.output_item.name) {
      toast.error('Please fill in required fields');
      return;
    }

    if (conversionForm.input_items.length === 0) {
      toast.error('Please add at least one input item');
      return;
    }

    if (conversionForm.output_item.quantity <= 0) {
      toast.error('Please enter a valid output quantity');
      return;
    }

    setLoading(true);
    const success = await executeConversion(conversionForm);
    setLoading(false);

    if (success) {
      // Reset form
      setConversionForm({
        name: '',
        description: '',
        input_items: [],
        output_item: {
          name: '',
          category: 'raw_materials',
          uom: '',
          quantity: 0,
          unit_cost: 0,
          sku: '',
          storage_location: ''
        }
      });
      loadData(); // Refresh data
    }
  };

  const getItemName = (itemId: string) => {
    const item = rawMaterials.find(item => item.id === itemId);
    return item ? item.name : 'Unknown Item';
  };

  const getItemUOM = (itemId: string) => {
    const item = rawMaterials.find(item => item.id === itemId);
    return item ? item.uom : '';
  };

  if (loading && rawMaterials.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Conversion Process</h2>
          <p className="text-muted-foreground">
            Convert raw materials into orderable inventory items
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          {showHistory ? 'Hide History' : 'Show History'}
        </Button>
      </div>

      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion History</CardTitle>
          </CardHeader>
          <CardContent>
            {conversionHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No conversions recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {conversionHistory.map((conversion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{conversion.commissary_item?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(conversion.conversion_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {conversion.finished_goods_quantity} {conversion.commissary_item?.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            New Conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conversion-name">Conversion Name *</Label>
                <Input
                  id="conversion-name"
                  value={conversionForm.name}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Flour to Dough Mix"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={conversionForm.description}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Input Items Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Input Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Raw Material</Label>
                    <Select
                      value={inputItem.commissary_item_id}
                      onValueChange={(value) => setInputItem(prev => ({ ...prev, commissary_item_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {rawMaterials.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.current_stock} {item.uom} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={inputItem.quantity}
                      onChange={(e) => setInputItem(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addInputItem} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {conversionForm.input_items.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Items:</Label>
                    {conversionForm.input_items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span>
                          {getItemName(item.commissary_item_id)} - {item.quantity} {getItemUOM(item.commissary_item_id)}
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeInputItem(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Output Item Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Output Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="output-name">Product Name *</Label>
                    <Input
                      id="output-name"
                      value={conversionForm.output_item.name}
                      onChange={(e) => setConversionForm(prev => ({
                        ...prev,
                        output_item: { ...prev.output_item, name: e.target.value }
                      }))}
                      placeholder="e.g., Pre-made Dough Mix"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={conversionForm.output_item.category}
                      onValueChange={(value: 'raw_materials' | 'packaging_materials' | 'supplies') => 
                        setConversionForm(prev => ({
                          ...prev,
                          output_item: { ...prev.output_item, category: value }
                        }))
                      }
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
                  <div className="space-y-2">
                    <Label htmlFor="output-quantity">Quantity *</Label>
                    <Input
                      id="output-quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={conversionForm.output_item.quantity}
                      onChange={(e) => setConversionForm(prev => ({
                        ...prev,
                        output_item: { ...prev.output_item, quantity: parseFloat(e.target.value) || 0 }
                      }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="output-uom">Unit of Measure *</Label>
                    <Input
                      id="output-uom"
                      value={conversionForm.output_item.uom}
                      onChange={(e) => setConversionForm(prev => ({
                        ...prev,
                        output_item: { ...prev.output_item, uom: e.target.value }
                      }))}
                      placeholder="e.g., kg, pieces, boxes"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="output-cost">Unit Cost</Label>
                    <Input
                      id="output-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={conversionForm.output_item.unit_cost}
                      onChange={(e) => setConversionForm(prev => ({
                        ...prev,
                        output_item: { ...prev.output_item, unit_cost: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="output-sku">SKU</Label>
                    <Input
                      id="output-sku"
                      value={conversionForm.output_item.sku}
                      onChange={(e) => setConversionForm(prev => ({
                        ...prev,
                        output_item: { ...prev.output_item, sku: e.target.value }
                      }))}
                      placeholder="Optional SKU"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading} className="min-w-32">
                {loading ? 'Processing...' : 'Execute Conversion'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
