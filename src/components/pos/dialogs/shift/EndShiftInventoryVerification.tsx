import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { fetchInventoryStock } from "@/services/inventoryStock/inventoryStockFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Shift } from "@/types";

interface EndShiftInventoryVerificationProps {
  storeId: string | null;
  currentShift: Shift | null;
  onInventoryCountChange: (inventoryCounts: Record<string, number>) => void;
}

export default function EndShiftInventoryVerification({ 
  storeId, 
  currentShift,
  onInventoryCountChange 
}: EndShiftInventoryVerificationProps) {
  const [actualCounts, setActualCounts] = useState<Record<string, number>>({});

  // Fetch current inventory stock items
  const { data: inventoryItems = [], isLoading } = useQuery({
    queryKey: ["inventory-stock", storeId],
    queryFn: () => storeId ? fetchInventoryStock(storeId) : Promise.resolve([]),
    enabled: !!storeId
  });

  // Initialize actual counts with current stock
  useEffect(() => {
    if (inventoryItems.length > 0) {
      const initialCounts: Record<string, number> = {};
      inventoryItems.forEach(item => {
        initialCounts[item.id] = item.stock_quantity || 0;
      });
      setActualCounts(initialCounts);
      onInventoryCountChange(initialCounts);
    }
  }, [inventoryItems, onInventoryCountChange]);

  const handleCountChange = (itemId: string, count: number) => {
    const updatedCounts = {
      ...actualCounts,
      [itemId]: count
    };
    setActualCounts(updatedCounts);
    onInventoryCountChange(updatedCounts);
  };

  const getStartingCount = (itemId: string) => {
    return currentShift?.startInventoryCount?.[itemId] || 0;
  };

  const getSystemExpected = (itemId: string) => {
    // This would ideally calculate expected remaining inventory based on sales
    // For now, we'll use current stock_quantity as the system expected
    const item = inventoryItems.find(i => i.id === itemId);
    return item?.stock_quantity || 0;
  };

  const getVariance = (itemId: string) => {
    const actual = actualCounts[itemId] || 0;
    const expected = getSystemExpected(itemId);
    return actual - expected;
  };

  const getVarianceType = (variance: number) => {
    if (variance > 0) return "overage";
    if (variance < 0) return "shortage";
    return "match";
  };

  const getVarianceBadge = (variance: number) => {
    const type = getVarianceType(variance);
    
    if (type === "match") {
      return <Badge variant="secondary" className="text-green-700 bg-green-100"><CheckCircle className="w-3 h-3 mr-1" />Match</Badge>;
    } else if (type === "overage") {
      return <Badge variant="secondary" className="text-blue-700 bg-blue-100"><Info className="w-3 h-3 mr-1" />+{variance}</Badge>;
    } else {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />{variance}</Badge>;
    }
  };

  const getTotalVariance = () => {
    return inventoryItems.reduce((total, item) => total + Math.abs(getVariance(item.id)), 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            End Shift Inventory Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
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
            End Shift Inventory Verification
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
            End Shift Inventory Verification
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Discrepancies: {getTotalVariance()} items
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Verify the actual inventory count at the end of your shift. System expected values are shown for comparison.
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {inventoryItems.map((item) => {
              const variance = getVariance(item.id);
              return (
                <div key={item.id} className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">{item.item}</Label>
                      <p className="text-xs text-muted-foreground">
                        Unit: {item.unit}
                      </p>
                    </div>
                    {getVarianceBadge(variance)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-muted-foreground">Start</div>
                      <div className="font-medium">{getStartingCount(item.id)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Expected</div>
                      <div className="font-medium">{getSystemExpected(item.id)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground">Actual</div>
                      <Input
                        type="number"
                        min="0"
                        value={actualCounts[item.id] || 0}
                        onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                        className="text-center text-sm h-8"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Discrepancies:</span>
            <span className="text-lg font-bold text-primary">{getTotalVariance()} items</span>
          </div>
          {getTotalVariance() > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Review discrepancies before ending shift. Variances will be recorded for audit purposes.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}