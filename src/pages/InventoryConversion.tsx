
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package, RefreshCw, History } from "lucide-react";
import { 
  CommissaryInventoryItem, 
  InventoryStock
} from "@/types/inventoryManagement";
import type { InventoryConversion } from "@/types/inventoryManagement";
import { 
  fetchCommissaryItemsForConversion,
  fetchStoreInventoryForConversion,
  createInventoryConversion,
  createOrFindStoreInventoryItem,
  fetchInventoryConversions
} from "@/services/inventoryManagement/inventoryConversionService";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";

export default function InventoryConversion() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [storeItems, setStoreItems] = useState<InventoryStock[]>([]);
  const [conversions, setConversions] = useState<InventoryConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  
  const [conversionForm, setConversionForm] = useState({
    commissary_item_id: '',
    inventory_stock_id: '',
    raw_material_quantity: 0,
    finished_goods_quantity: 0,
    new_item_name: '',
    new_item_unit: '',
    notes: ''
  });

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    if (!hasAdminAccess) {
      toast.error('Access denied. Inventory conversion is only available to administrators.');
      return;
    }
    if (!currentStore?.id) {
      toast.error('Please select a store first.');
      return;
    }
    loadData();
  }, [hasAdminAccess, currentStore?.id]);

  const loadData = async () => {
    if (!currentStore?.id) return;
    
    setLoading(true);
    await Promise.all([
      loadCommissaryItems(),
      loadStoreItems(),
      loadConversions()
    ]);
    setLoading(false);
  };

  const loadCommissaryItems = async () => {
    const data = await fetchCommissaryItemsForConversion();
    setCommissaryItems(data);
  };

  const loadStoreItems = async () => {
    if (!currentStore?.id) return;
    const data = await fetchStoreInventoryForConversion(currentStore.id);
    setStoreItems(data);
  };

  const loadConversions = async () => {
    if (!currentStore?.id) return;
    const data = await fetchInventoryConversions(currentStore.id);
    setConversions(data);
  };

  const handleConversion = async () => {
    if (!currentStore?.id || !user?.id) {
      toast.error('Missing required information');
      return;
    }

    if (!conversionForm.commissary_item_id || conversionForm.raw_material_quantity <= 0 || conversionForm.finished_goods_quantity <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate sufficient commissary stock
    const selectedItem = commissaryItems.find(item => item.id === conversionForm.commissary_item_id);
    if (selectedItem && conversionForm.raw_material_quantity > selectedItem.current_stock) {
      toast.error(`Insufficient stock. Available: ${selectedItem.current_stock} ${selectedItem.unit}`);
      return;
    }

    setConverting(true);

    try {
      let inventoryStockId = conversionForm.inventory_stock_id;

      // If creating a new item, create it first
      if (!inventoryStockId && conversionForm.new_item_name && conversionForm.new_item_unit) {
        const newItem = await createOrFindStoreInventoryItem(
          currentStore.id,
          conversionForm.new_item_name,
          conversionForm.new_item_unit
        );
        
        if (!newItem) {
          toast.error('Failed to create new inventory item');
          return;
        }
        
        inventoryStockId = newItem.id;
        await loadStoreItems(); // Refresh store items list
      }

      if (!inventoryStockId) {
        toast.error('Please select or create a target inventory item');
        return;
      }

      const conversion = await createInventoryConversion({
        commissary_item_id: conversionForm.commissary_item_id,
        store_id: currentStore.id,
        inventory_stock_id: inventoryStockId,
        raw_material_quantity: conversionForm.raw_material_quantity,
        finished_goods_quantity: conversionForm.finished_goods_quantity,
        conversion_ratio: conversionForm.finished_goods_quantity / conversionForm.raw_material_quantity,
        conversion_date: new Date().toISOString(),
        converted_by: user.id,
        notes: conversionForm.notes
      });

      if (conversion) {
        // Reset form
        setConversionForm({
          commissary_item_id: '',
          inventory_stock_id: '',
          raw_material_quantity: 0,
          finished_goods_quantity: 0,
          new_item_name: '',
          new_item_unit: '',
          notes: ''
        });

        // Reload data
        await loadData();
      }
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to complete conversion');
    } finally {
      setConverting(false);
    }
  };

  const selectedCommissaryItem = commissaryItems.find(item => item.id === conversionForm.commissary_item_id);

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Inventory conversion is only available to administrators and owners.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentStore?.id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No Store Selected</h2>
            <p className="text-muted-foreground">
              Please select a store to manage inventory conversions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Inventory Conversion</h1>
        <p className="text-muted-foreground">
          Convert raw materials from commissary to finished goods for {currentStore.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Create Conversion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="commissary_item">Raw Material (Commissary)</Label>
              <Select
                value={conversionForm.commissary_item_id}
                onValueChange={(value) => setConversionForm(prev => ({ ...prev, commissary_item_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select raw material" />
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
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Available:</span> {selectedCommissaryItem.current_stock} {selectedCommissaryItem.unit}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Unit Cost:</span> ${selectedCommissaryItem.unit_cost?.toFixed(2) || 'N/A'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="raw_quantity">Raw Material Quantity</Label>
                <Input
                  id="raw_quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={conversionForm.raw_material_quantity}
                  onChange={(e) => setConversionForm(prev => ({ 
                    ...prev, 
                    raw_material_quantity: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="finished_quantity">Finished Goods Quantity</Label>
                <Input
                  id="finished_quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  value={conversionForm.finished_goods_quantity}
                  onChange={(e) => setConversionForm(prev => ({ 
                    ...prev, 
                    finished_goods_quantity: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-center py-2">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <Label>Target Inventory Item</Label>
              <Select
                value={conversionForm.inventory_stock_id}
                onValueChange={(value) => setConversionForm(prev => ({ 
                  ...prev, 
                  inventory_stock_id: value,
                  new_item_name: '',
                  new_item_unit: ''
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select existing item or create new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Create New Item</SelectItem>
                  {storeItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.item} ({item.stock_quantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!conversionForm.inventory_stock_id && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_item_name">New Item Name</Label>
                  <Input
                    id="new_item_name"
                    value={conversionForm.new_item_name}
                    onChange={(e) => setConversionForm(prev => ({ ...prev, new_item_name: e.target.value }))}
                    placeholder="Enter item name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new_item_unit">Unit</Label>
                  <Input
                    id="new_item_unit"
                    value={conversionForm.new_item_unit}
                    onChange={(e) => setConversionForm(prev => ({ ...prev, new_item_unit: e.target.value }))}
                    placeholder="e.g., portions, pieces"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={conversionForm.notes}
                onChange={(e) => setConversionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this conversion..."
                rows={3}
              />
            </div>

            <Button 
              onClick={handleConversion} 
              disabled={converting}
              className="w-full bg-croffle-accent hover:bg-croffle-accent/90"
            >
              {converting ? 'Converting...' : 'Convert Materials'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Conversions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : conversions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No conversions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversions.slice(0, 10).map((conversion) => (
                  <div key={conversion.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {new Date(conversion.conversion_date).toLocaleDateString()}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{conversion.commissary_item?.name}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{conversion.inventory_stock?.item}</span>
                      </div>
                      
                      <div className="text-muted-foreground">
                        {conversion.raw_material_quantity} → {conversion.finished_goods_quantity}
                      </div>
                      
                      {conversion.notes && (
                        <div className="text-muted-foreground italic">
                          {conversion.notes}
                        </div>
                      )}
                    </div>
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
