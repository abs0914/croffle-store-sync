import { useEffect, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Package, AlertTriangle } from "lucide-react";
import { InventoryStock } from "@/types/inventory";

interface DirectInventorySelectorProps {
  selectedInventoryStockId: string | null;
  onInventoryStockChange: (stockId: string | null, stockItem: InventoryStock | null) => void;
  sellingQuantity: number;
  onSellingQuantityChange: (quantity: number) => void;
  formData: any;
}

export const DirectInventorySelector = ({
  selectedInventoryStockId,
  onInventoryStockChange,
  sellingQuantity,
  onSellingQuantityChange,
  formData
}: DirectInventorySelectorProps) => {
  const { currentStore } = useStore();
  const [selectedStock, setSelectedStock] = useState<InventoryStock | null>(null);

  // Fetch inventory stock for the current store
  const { data: inventoryStock = [], isLoading } = useQuery({
    queryKey: ['inventory-stock', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return [];
      
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', currentStore.id)
        .eq('is_active', true)
        .order('item');
      
      if (error) throw error;
      return data as InventoryStock[];
    },
    enabled: !!currentStore?.id
  });

  // Update selected stock when selection changes
  useEffect(() => {
    if (selectedInventoryStockId) {
      const stock = inventoryStock.find(s => s.id === selectedInventoryStockId);
      setSelectedStock(stock || null);
    } else {
      setSelectedStock(null);
    }
  }, [selectedInventoryStockId, inventoryStock]);

  const handleStockSelection = (stockId: string) => {
    const stock = inventoryStock.find(s => s.id === stockId);
    setSelectedStock(stock || null);
    onInventoryStockChange(stockId, stock || null);
  };

  const getStockStatus = (stock: InventoryStock) => {
    if (stock.stock_quantity <= 0) {
      return { status: 'out-of-stock', color: 'destructive', text: 'Out of Stock' };
    } else if (stock.stock_quantity <= (stock.minimum_threshold || 10)) {
      return { status: 'low-stock', color: 'warning', text: 'Low Stock' };
    }
    return { status: 'in-stock', color: 'success', text: 'In Stock' };
  };

  const calculateSellingUnitStock = () => {
    if (!selectedStock || sellingQuantity <= 0) return 0;
    return Math.floor(selectedStock.stock_quantity / sellingQuantity);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">Loading inventory items...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Item Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inventory-stock">Select Inventory Item</Label>
            <Select
              value={selectedInventoryStockId || ""}
              onValueChange={handleStockSelection}
            >
              <SelectTrigger id="inventory-stock">
                <SelectValue placeholder="Choose an inventory item to link to this product" />
              </SelectTrigger>
              <SelectContent>
                {inventoryStock.map((stock) => {
                  const stockStatus = getStockStatus(stock);
                  return (
                    <SelectItem key={stock.id} value={stock.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>{stock.item}</span>
                          <Badge variant="outline" className="text-xs">
                            {stock.unit}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-sm text-muted-foreground">
                            {stock.stock_quantity} {stock.unit}
                          </span>
                          <Badge 
                            variant={stockStatus.color as any}
                            className="text-xs"
                          >
                            {stockStatus.text}
                          </Badge>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedStock && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Selected: <strong>{selectedStock.item}</strong> - 
                Current stock: <strong>{selectedStock.stock_quantity} {selectedStock.unit}</strong>
                {selectedStock.cost && ` - Cost: ₱${selectedStock.cost}`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedStock && (
        <Card>
          <CardHeader>
            <CardTitle>Unit of Measure Conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inventory Unit</Label>
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">{selectedStock.unit}</div>
                  <div className="text-xs text-muted-foreground">
                    How inventory is stored
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="selling-quantity">Selling Quantity per Unit</Label>
                <Input
                  id="selling-quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sellingQuantity}
                  onChange={(e) => onSellingQuantityChange(parseFloat(e.target.value) || 1)}
                  placeholder="1"
                />
                <div className="text-xs text-muted-foreground">
                  How many {selectedStock.unit} per product sale
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-sm font-medium mb-2">Stock Calculation</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Available inventory:</span>
                  <span className="font-medium">{selectedStock.stock_quantity} {selectedStock.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per product sale:</span>
                  <span className="font-medium">{sellingQuantity} {selectedStock.unit}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-2">
                  <span className="font-medium">Products available for sale:</span>
                  <span className="font-bold text-primary">
                    {calculateSellingUnitStock()} products
                  </span>
                </div>
              </div>
            </div>

            {calculateSellingUnitStock() === 0 && selectedStock.stock_quantity > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The selling quantity ({sellingQuantity} {selectedStock.unit}) is greater than 
                  available stock ({selectedStock.stock_quantity} {selectedStock.unit}). 
                  No products can be sold until inventory is restocked.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};