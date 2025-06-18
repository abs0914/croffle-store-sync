
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { fetchInventoryConversions } from "@/services/inventoryManagement/inventoryConversionService";
import { fetchInventoryStock } from "@/services/inventoryStock/inventoryStockFetch";
import type { InventoryConversion, InventoryStock } from "@/types/inventoryManagement";

interface ProductionDashboardProps {
  storeId: string;
}

interface ProductionMetrics {
  totalConversions: number;
  recentConversions: number;
  lowStockItems: number;
  totalInventoryValue: number;
}

export function ProductionDashboard({ storeId }: ProductionDashboardProps) {
  const [conversions, setConversions] = useState<InventoryConversion[]>([]);
  const [inventory, setInventory] = useState<InventoryStock[]>([]);
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    totalConversions: 0,
    recentConversions: 0,
    lowStockItems: 0,
    totalInventoryValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [storeId]);

  const loadDashboardData = async () => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      const [conversionsData, inventoryData] = await Promise.all([
        fetchInventoryConversions(storeId),
        fetchInventoryStock(storeId)
      ]);

      setConversions(conversionsData);
      setInventory(inventoryData);

      // Calculate metrics
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentConversions = conversionsData.filter(
        conv => new Date(conv.conversion_date) >= weekAgo
      ).length;

      const lowStockItems = inventoryData.filter(
        item => item.stock_quantity <= (item.minimum_threshold || 10)
      ).length;

      const totalValue = inventoryData.reduce(
        (sum, item) => sum + (item.stock_quantity * (item.cost || 0)), 0
      );

      setMetrics({
        totalConversions: conversionsData.length,
        recentConversions,
        lowStockItems,
        totalInventoryValue: totalValue
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Preparations</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              All time conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentConversions}</div>
            <p className="text-xs text-muted-foreground">
              Recent preparations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{metrics.totalInventoryValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Current stock value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Preparations</CardTitle>
          </CardHeader>
          <CardContent>
            {conversions.slice(0, 5).length === 0 ? (
              <div className="text-center py-8">
                <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No preparations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversions.slice(0, 5).map((conversion) => (
                  <div key={conversion.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {conversion.inventory_stock?.item || 'Unknown Item'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conversion.conversion_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {conversion.finished_goods_quantity} {conversion.inventory_stock?.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {inventory.filter(item => item.stock_quantity <= (item.minimum_threshold || 10)).slice(0, 5).length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-green-600">All items well stocked</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventory
                  .filter(item => item.stock_quantity <= (item.minimum_threshold || 10))
                  .slice(0, 5)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{item.item}</p>
                        <p className="text-xs text-muted-foreground">
                          Current: {item.stock_quantity} {item.unit}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        Low Stock
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
