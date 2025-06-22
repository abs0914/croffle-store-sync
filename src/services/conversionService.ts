
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest, CommissaryInventoryItem } from "@/types/commissary";
import { toast } from "sonner";

export const executeConversion = async (conversionRequest: ConversionRequest): Promise<boolean> => {
  try {
    console.log('Starting conversion process:', conversionRequest);

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;

    if (!currentUserId) {
      toast.error('User not authenticated');
      return false;
    }

    // Validate input items have sufficient stock
    for (const inputItem of conversionRequest.input_items) {
      const { data: item, error } = await supabase
        .from('commissary_inventory')
        .select('current_stock, name')
        .eq('id', inputItem.commissary_item_id)
        .single();

      if (error) {
        toast.error(`Error checking stock for item: ${error.message}`);
        return false;
      }

      if (item.current_stock < inputItem.quantity) {
        toast.error(`Insufficient stock for ${item.name}. Available: ${item.current_stock}, Required: ${inputItem.quantity}`);
        return false;
      }
    }

    // Create the output item as orderable_item
    const { data: newItem, error: createError } = await supabase
      .from('commissary_inventory')
      .insert({
        name: conversionRequest.output_item.name,
        category: conversionRequest.output_item.category,
        item_type: 'orderable_item',
        current_stock: conversionRequest.output_item.quantity,
        minimum_threshold: 0,
        unit: conversionRequest.output_item.uom,
        unit_cost: conversionRequest.output_item.unit_cost || 0,
        sku: conversionRequest.output_item.sku,
        storage_location: conversionRequest.output_item.storage_location,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      toast.error(`Error creating output item: ${createError.message}`);
      return false;
    }

    // Create conversion record
    const { data: conversion, error: conversionError } = await supabase
      .from('inventory_conversions')
      .insert({
        store_id: null, // Commissary conversions don't have a specific store
        commissary_item_id: newItem.id,
        inventory_stock_id: null,
        conversion_recipe_id: null,
        finished_goods_quantity: conversionRequest.output_item.quantity,
        converted_by: currentUserId,
        notes: conversionRequest.description || `Conversion: ${conversionRequest.name}`
      })
      .select()
      .single();

    if (conversionError) {
      toast.error(`Error creating conversion record: ${conversionError.message}`);
      return false;
    }

    // Update input items stock and create conversion ingredients records
    for (const inputItem of conversionRequest.input_items) {
      // Update stock
      const { error: updateError } = await supabase
        .from('commissary_inventory')
        .update({
          current_stock: supabase.rpc('subtract_stock', {
            current_stock: supabase.raw('current_stock'),
            quantity: inputItem.quantity
          })
        })
        .eq('id', inputItem.commissary_item_id);

      if (updateError) {
        toast.error(`Error updating stock: ${updateError.message}`);
        return false;
      }

      // Create conversion ingredient record
      const { error: ingredientError } = await supabase
        .from('conversion_ingredients')
        .insert({
          inventory_conversion_id: conversion.id,
          commissary_item_id: inputItem.commissary_item_id,
          quantity_used: inputItem.quantity
        });

      if (ingredientError) {
        console.warn('Error creating conversion ingredient record:', ingredientError);
      }
    }

    toast.success(`Successfully converted materials into ${conversionRequest.output_item.name}`);
    return true;

  } catch (error) {
    console.error('Conversion error:', error);
    toast.error('Failed to execute conversion');
    return false;
  }
};

export const fetchConversionHistory = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_conversions')
      .select(`
        *,
        commissary_item:commissary_inventory(name, unit),
        conversion_ingredients(
          quantity_used,
          commissary_item:commissary_inventory(name, unit)
        )
      `)
      .order('conversion_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching conversion history:', error);
    toast.error('Failed to fetch conversion history');
    return [];
  }
};

export const fetchAvailableRawMaterials = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .in('item_type', ['raw_material', 'supply'])
      .eq('is_active', true)
      .gt('current_stock', 0)
      .order('name');

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      uom: item.unit || 'units',
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies'
    }));
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    toast.error('Failed to fetch raw materials');
    return [];
  }
};
</lov-sql>

Now I'll create the new ConversionProcessTab component:

<lov-write file_path="src/pages/ProductionManagement/components/ConversionProcessTab.tsx">
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, Package, ArrowRight, History, Trash2 } from "lucide-react";
import { CommissaryInventoryItem, ConversionRequest, STANDARD_UOM_OPTIONS } from "@/types/commissary";
import { 
  executeConversion, 
  fetchConversionHistory, 
  fetchAvailableRawMaterials 
} from "@/services/conversionService";
import { toast } from "sonner";

export function ConversionProcessTab() {
  const [rawMaterials, setRawMaterials] = useState<CommissaryInventoryItem[]>([]);
  const [conversionHistory, setConversionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Conversion form state
  const [conversionName, setConversionName] = useState('');
  const [conversionDescription, setConversionDescription] = useState('');
  const [inputItems, setInputItems] = useState<{ commissary_item_id: string; quantity: number; }[]>([]);
  const [outputItem, setOutputItem] = useState({
    name: '',
    category: 'raw_materials' as 'raw_materials' | 'packaging_materials' | 'supplies',
    uom: '',
    quantity: 0,
    unit_cost: 0,
    sku: '',
    storage_location: ''
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
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addInputItem = () => {
    setInputItems([...inputItems, { commissary_item_id: '', quantity: 0 }]);
  };

  const removeInputItem = (index: number) => {
    setInputItems(inputItems.filter((_, i) => i !== index));
  };

  const updateInputItem = (index: number, field: string, value: any) => {
    const updated = [...inputItems];
    updated[index] = { ...updated[index], [field]: value };
    setInputItems(updated);
  };

  const calculateTotalCost = () => {
    return inputItems.reduce((total, item) => {
      const material = rawMaterials.find(m => m.id === item.commissary_item_id);
      return total + (material?.unit_cost || 0) * item.quantity;
    }, 0);
  };

  const handleConversion = async () => {
    if (!conversionName || !outputItem.name || inputItems.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (inputItems.some(item => !item.commissary_item_id || item.quantity <= 0)) {
      toast.error('Please select valid input items with quantities');
      return;
    }

    if (outputItem.quantity <= 0) {
      toast.error('Output quantity must be greater than 0');
      return;
    }

    const conversionRequest: ConversionRequest = {
      name: conversionName,
      description: conversionDescription,
      input_items: inputItems,
      output_item: {
        ...outputItem,
        unit_cost: outputItem.unit_cost || calculateTotalCost() / outputItem.quantity
      }
    };

    setProcessing(true);
    const success = await executeConversion(conversionRequest);
    setProcessing(false);

    if (success) {
      // Reset form
      setConversionName('');
      setConversionDescription('');
      setInputItems([]);
      setOutputItem({
        name: '',
        category: 'raw_materials',
        uom: '',
        quantity: 0,
        unit_cost: 0,
        sku: '',
        storage_location: ''
      });
      
      // Reload data
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading conversion data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Conversion Process</h2>
        <p className="text-muted-foreground">
          Convert raw materials and supplies into orderable items for stores
        </p>
      </div>

      <Tabs defaultValue="convert" className="space-y-4">
        <TabsList>
          <TabsTrigger value="convert">New Conversion</TabsTrigger>
          <TabsTrigger value="history">Conversion History</TabsTrigger>
        </TabsList>

        <TabsContent value="convert">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Conversion Form */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="conversion-name">Conversion Name *</Label>
                  <Input
                    id="conversion-name"
                    value={conversionName}
                    onChange={(e) => setConversionName(e.target.value)}
                    placeholder="e.g., Raw Flour to Croffle Mix"
                  />
                </div>

                <div>
                  <Label htmlFor="conversion-description">Description</Label>
                  <Textarea
                    id="conversion-description"
                    value={conversionDescription}
                    onChange={(e) => setConversionDescription(e.target.value)}
                    placeholder="Optional conversion notes..."
                  />
                </div>

                {/* Input Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Input Materials *</Label>
                    <Button onClick={addInputItem} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {inputItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select
                          value={item.commissary_item_id}
                          onValueChange={(value) => updateInputItem(index, 'commissary_item_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {rawMaterials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name} ({material.current_stock} {material.uom})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInputItem(index, 'quantity', Number(e.target.value))}
                          placeholder="Qty"
                        />
                      </div>
                      <Button
                        onClick={() => removeInputItem(index)}
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Total Cost Display */}
                {inputItems.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium">
                      Total Input Cost: ₱{calculateTotalCost().toFixed(2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Output Item */}
            <Card>
              <CardHeader>
                <CardTitle>Output Item</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="output-name">Item Name *</Label>
                  <Input
                    id="output-name"
                    value={outputItem.name}
                    onChange={(e) => setOutputItem({...outputItem, name: e.target.value})}
                    placeholder="e.g., Croffle Mix Ready"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={outputItem.category}
                      onValueChange={(value: any) => setOutputItem({...outputItem, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw_materials">Raw Materials</SelectItem>
                        <SelectItem value="packaging_materials">Packaging</SelectItem>
                        <SelectItem value="supplies">Supplies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Unit of Measure *</Label>
                    <Select
                      value={outputItem.uom}
                      onValueChange={(value) => setOutputItem({...outputItem, uom: value})}
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="output-quantity">Quantity *</Label>
                    <Input
                      id="output-quantity"
                      type="number"
                      value={outputItem.quantity}
                      onChange={(e) => setOutputItem({...outputItem, quantity: Number(e.target.value)})}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="output-cost">Unit Cost</Label>
                    <Input
                      id="output-cost"
                      type="number"
                      step="0.01"
                      value={outputItem.unit_cost}
                      onChange={(e) => setOutputItem({...outputItem, unit_cost: Number(e.target.value)})}
                      placeholder="Auto-calculated"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="output-sku">SKU</Label>
                  <Input
                    id="output-sku"
                    value={outputItem.sku}
                    onChange={(e) => setOutputItem({...outputItem, sku: e.target.value})}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <Label htmlFor="output-location">Storage Location</Label>
                  <Input
                    id="output-location"
                    value={outputItem.storage_location}
                    onChange={(e) => setOutputItem({...outputItem, storage_location: e.target.value})}
                    placeholder="Optional"
                  />
                </div>

                <Button 
                  onClick={handleConversion}
                  disabled={processing}
                  className="w-full bg-croffle-accent hover:bg-croffle-accent/90"
                >
                  {processing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Execute Conversion
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Conversion History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversionHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No conversions performed yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversionHistory.map((conversion) => (
                    <div key={conversion.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">
                            {conversion.commissary_item?.name || 'Unknown Item'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(conversion.conversion_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {conversion.finished_goods_quantity} {conversion.commissary_item?.unit}
                        </Badge>
                      </div>
                      
                      {conversion.conversion_ingredients?.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium mb-1">Input Materials:</p>
                          <ul className="list-disc list-inside">
                            {conversion.conversion_ingredients.map((ingredient: any, idx: number) => (
                              <li key={idx}>
                                {ingredient.commissary_item?.name}: {ingredient.quantity_used} {ingredient.commissary_item?.unit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {conversion.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <strong>Notes:</strong> {conversion.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
