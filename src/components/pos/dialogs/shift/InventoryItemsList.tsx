import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock/inventoryStockFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";

interface InventoryItemsListProps {
  storeId: string | null;
  onInventoryCountChange: (inventoryCounts: Record<string, number>) => void;
}

export default function InventoryItemsList({ 
  storeId, 
  onInventoryCountChange 
}: InventoryItemsListProps) {
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});

  // Fetch inventory stock items
  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["inventory-stock", storeId],
    queryFn: () => storeId ? fetchInventoryStock(storeId) : Promise.resolve([]),
    enabled: !!storeId
  });

  // Initialize inventory counts with current stock
  useEffect(() => {
    if (inventoryItems.length > 0) {
      const initialCounts: Record<string, number> = {};
      inventoryItems.forEach(item => {
        initialCounts[item.id] = item.stock_quantity || 0;
      });
      setInventoryCounts(initialCounts);
      onInventoryCountChange(initialCounts);
    }
  }, [inventoryItems, onInventoryCountChange]);

  const handleCountChange = (itemId: string, count: number) => {
    const updatedCounts = {
      ...inventoryCounts,
      [itemId]: count
    };
    setInventoryCounts(updatedCounts);
    onInventoryCountChange(updatedCounts);
  };

  const getTotalItemCount = () => {
    return Object.values(inventoryCounts).reduce((sum, count) => sum + count, 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!inventoryItems.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Count
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No inventory items found for this store</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Count
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Total: {getTotalItemCount()} items
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {inventoryItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{item.item}</Label>
                  <p className="text-xs text-muted-foreground">
                    Unit: {item.unit} • Current Stock: {item.stock_quantity || 0}
                  </p>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={inventoryCounts[item.id] || 0}
                    onChange={(e) => handleCountChange(item.id, parseFloat(e.target.value) || 0)}
                    className="text-right text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Items:</span>
            <span className="text-lg font-bold text-primary">{getTotalItemCount()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}