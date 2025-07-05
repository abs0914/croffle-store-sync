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
import { Info, Package, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
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

  // Fetch inventory stock for the current store with real-time updates
  const { data: inventoryStock = [], isLoading, refetch } = useQuery({
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
    enabled: !!currentStore?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds for real-time stock updates
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
      return { status: 'out-of-stock', color: 'destructive', text: 'Out of Stock', bgColor: 'bg-red-100 text-red-800' };
    } else if (stock.stock_quantity <= (stock.minimum_threshold || 10)) {
      return { status: 'low-stock', color: 'outline', text: 'Low Stock', bgColor: 'bg-yellow-100 text-yellow-800 border-yellow-500' };
    }
    return { status: 'in-stock', color: 'default', text: 'In Stock', bgColor: 'bg-green-100 text-green-800' };
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Item Selection
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Live Stock Data
              </Badge>
              <RefreshCw 
                className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-primary transition-colors" 
                onClick={() => refetch()}
              />
            </div>
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
                            className={`text-xs ${stockStatus.bgColor}`}
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

            {/* Stock Status Alerts */}
            {calculateSellingUnitStock() === 0 && selectedStock.stock_quantity > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="space-y-2">
                    <p>The selling quantity ({sellingQuantity} {selectedStock.unit}) is greater than 
                    available stock ({selectedStock.stock_quantity} {selectedStock.unit}).</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Quick action:</span>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View in Inventory
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {calculateSellingUnitStock() > 0 && calculateSellingUnitStock() <= 5 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="space-y-2">
                    <p><strong>Low Stock Warning:</strong> Only {calculateSellingUnitStock()} products can be sold with current inventory.</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Recommended action:</span>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Restock Soon
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {calculateSellingUnitStock() > 50 && (
              <Alert className="border-green-200 bg-green-50">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Good Stock Level:</strong> {calculateSellingUnitStock()} products available for sale. 
                  Inventory is well-stocked for this product.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};