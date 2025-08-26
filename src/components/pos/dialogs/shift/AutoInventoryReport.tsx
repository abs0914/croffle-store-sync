
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock";
import { Shift } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/format";
import { Package, TrendingDown, TrendingUp } from "lucide-react";

interface AutoInventoryReportProps {
  currentShift: Shift | null;
}

export default function AutoInventoryReport({ currentShift }: AutoInventoryReportProps) {
  const { data: inventoryStock, isLoading } = useQuery({
    queryKey: ['inventory-stock', currentShift?.storeId],
    queryFn: () => currentShift?.storeId ? fetchInventoryStock(currentShift.storeId) : Promise.resolve([]),
    enabled: !!currentShift?.storeId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Auto-Generated Inventory Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  const lowStockItems = inventoryStock?.filter(item => 
    item.current_stock <= item.minimum_threshold
  ) || [];

  const totalValue = inventoryStock?.reduce((sum, item) => 
    sum + (item.current_stock * (item.unit_price || 0)), 0
  ) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Auto-Generated Inventory Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{inventoryStock?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{lowStockItems.length}</p>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Items Requiring Attention
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex justify-between text-sm p-2 bg-red-50 rounded">
                  <span>{item.product?.name || 'Unknown Item'}</span>
                  <span className="text-red-600">
                    {item.current_stock} / {item.minimum_threshold}
                  </span>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{lowStockItems.length - 5} more items need attention
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-green-700">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            This report was automatically generated from current system data. 
            No manual count required.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
