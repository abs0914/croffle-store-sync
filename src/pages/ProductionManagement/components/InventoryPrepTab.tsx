
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, ArrowRight, Clock } from "lucide-react";
import { 
  fetchCommissaryItemsForConversion,
  fetchStoreInventoryForConversion,
  createOrFindStoreInventoryItem,
  fetchInventoryConversions
} from "@/services/inventoryManagement/inventoryConversionService";
import type { 
  CommissaryInventoryItem, 
  InventoryStock,
  InventoryConversion
} from "@/types/inventoryManagement";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface InventoryPrepTabProps {
  storeId: string;
}

interface SimpleConversionForm {
  commissaryItemId: string;
  quantityToConvert: number;
  targetItemName: string;
  targetUnit: string;
  outputQuantity: number;
  notes: string;
}

export function InventoryPrepTab({ storeId }: InventoryPrepTabProps) {
  const { user } = useAuth();
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [storeItems, setStoreItems] = useState<InventoryStock[]>([]);
  const [conversions, setConversions] = useState<InventoryConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  
  const [conversionForm, setConversionForm] = useState<SimpleConversionForm>({
    commissaryItemId: '',
    quantityToConvert: 0,
    targetItemName: '',
    targetUnit: '',
    outputQuantity: 0,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [commissary, store, conversionHistory] = await Promise.all([
        fetchCommissaryItemsForConversion(),
        fetchStoreInventoryForConversion(storeId),
        fetchInventoryConversions(storeId)
      ]);
      
      setCommissaryItems(commissary);
      setStoreItems(store);
      setConversions(conversionHistory.slice(0, 10)); // Recent 10 conversions
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load preparation data');
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleConversion = async () => {
    if (!user?.id) {
      toast.error('Authentication required');
      return;
    }

    if (!conversionForm.commissaryItemId || !conversionForm.targetItemName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setConverting(true);

    try {
      // Create or find target item
      const targetItem = await createOrFindStoreInventoryItem(
        storeId,
        conversionForm.targetItemName,
        conversionForm.targetUnit
      );

      if (!targetItem) {
        toast.error('Failed to create target inventory item');
        return;
      }

      // Create conversion using existing service
      const conversionData = {
        ingredients: [{
          commissary_item_id: conversionForm.commissaryItemId,
          quantity: conversionForm.quantityToConvert,
          available_stock: 0, // Will be validated by service
          unit_cost: 0
        }],
        inventory_stock_id: targetItem.id,
        new_item_name: conversionForm.targetItemName,
        new_item_unit: conversionForm.targetUnit,
        finished_goods_quantity: conversionForm.outputQuantity,
        notes: conversionForm.notes
      };

      // Use existing service function
      const { createMultiIngredientConversion } = await import('@/services/inventoryManagement/inventoryConversionService');
      
      const result = await createMultiIngredientConversion(
        conversionData,
        storeId,
        user.id
      );

      if (result) {
        await loadData();
        setConversionForm({
          commissaryItemId: '',
          quantityToConvert: 0,
          targetItemName: '',
          targetUnit: '',
          outputQuantity: 0,
          notes: ''
        });
        toast.success('Inventory preparation completed successfully');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to complete inventory preparation');
    } finally {
      setConverting(false);
    }
  };

  const selectedCommissaryItem = commissaryItems.find(item => item.id === conversionForm.commissaryItemId);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Simple Conversion Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Quick Inventory Prep
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Convert commissary items to store inventory for immediate use
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source Item (Commissary)</Label>
              <Select 
                value={conversionForm.commissaryItemId} 
                onValueChange={(value) => setConversionForm(prev => ({ ...prev, commissaryItemId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select commissary item" />
                </SelectTrigger>
                <SelectContent>
                  {commissaryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.current_stock} {item.unit} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCommissaryItem && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Available: {selectedCommissaryItem.current_stock} {selectedCommissaryItem.unit}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity to Convert</Label>
                <Input
                  type="number"
                  value={conversionForm.quantityToConvert}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, quantityToConvert: Number(e.target.value) }))}
                  placeholder="0"
                  min="0"
                  max={selectedCommissaryItem?.current_stock || 999}
                />
              </div>
              <div className="space-y-2">
                <Label>Output Quantity</Label>
                <Input
                  type="number"
                  value={conversionForm.outputQuantity}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, outputQuantity: Number(e.target.value) }))}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-center py-2">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Item Name</Label>
                <Input
                  value={conversionForm.targetItemName}
                  onChange={(e) => setConversionForm(prev => ({ ...prev, targetItemName: e.target.value }))}
                  placeholder="e.g., Croffle Mix (Ready)"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Unit</Label>
                <Select 
                  value={conversionForm.targetUnit} 
                  onValueChange={(value) => setConversionForm(prev => ({ ...prev, targetUnit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="g">Grams</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="ml">Milliliters</SelectItem>
                    <SelectItem value="packs">Packs</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={conversionForm.notes}
                onChange={(e) => setConversionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional preparation notes..."
              />
            </div>

            <Button 
              onClick={handleSimpleConversion}
              disabled={converting || !conversionForm.commissaryItemId || !conversionForm.targetItemName}
              className="w-full"
            >
              {converting ? (
                <>Processing...</>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Complete Preparation
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Preparations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Preparations
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest inventory preparation activities
            </p>
          </CardHeader>
          <CardContent>
            {conversions.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No preparations yet</p>
                <p className="text-sm text-muted-foreground">
                  Start with your first inventory preparation
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversions.map((conversion) => (
                  <div key={conversion.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {conversion.inventory_stock?.item || 'Unknown Item'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conversion.conversion_date).toLocaleDateString()} • 
                        {conversion.finished_goods_quantity} {conversion.inventory_stock?.unit}
                      </p>
                      {conversion.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {conversion.notes}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Completed
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
