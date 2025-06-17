
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, Factory, ChefHat, TrendingUp } from "lucide-react";
import { fetchCommissaryItemsForConversion } from "@/services/inventoryManagement/inventoryConversionService";
import { fetchInventoryStock } from "@/services/inventoryManagement/recipeService";
import { fetchInventoryAlerts } from "@/services/storeInventory/inventoryAlertService";
import type { CommissaryInventoryItem, InventoryStock } from "@/types/inventoryManagement";
import type { InventoryAlert } from "@/services/storeInventory/inventoryAlertService";

interface ProductionDashboardProps {
  storeId: string;
}

export function ProductionDashboard({ storeId }: ProductionDashboardProps) {
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [storeInventory, setStoreInventory] = useState<InventoryStock[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [storeId]);

  const loadDashboardData = async () => {
    setLoading(true);
    const [commissaryData, storeData, alertsData] = await Promise.all([
      fetchCommissaryItemsForConversion(),
      fetchInventoryStock(storeId),
      fetchInventoryAlerts(storeId)
    ]);
    
    setCommissaryItems(commissaryData);
    setStoreInventory(storeData);
    setAlerts(alertsData);
    setLoading(false);
  };

  const lowStockCommissary = commissaryItems.filter(item => 
    item.current_stock <= item.minimum_threshold && item.current_stock > 0
  );
  
  const outOfStockCommissary = commissaryItems.filter(item => 
    item.current_stock === 0
  );

  const lowStockStore = storeInventory.filter(item => 
    item.stock_quantity <= 5 && item.stock_quantity > 0
  );

  const outOfStockStore = storeInventory.filter(item => 
    item.stock_quantity === 0
  );

  const metrics = [
    {
      title: "Commissary Items",
      value: commissaryItems.length,
      subtitle: `${lowStockCommissary.length} low stock`,
      icon: Factory,
      color: "text-blue-600",
      alert: lowStockCommissary.length > 0
    },
    {
      title: "Store Inventory",
      value: storeInventory.length,
      subtitle: `${lowStockStore.length} low stock`,
      icon: Package,
      color: "text-green-600",
      alert: lowStockStore.length > 0
    },
    {
      title: "Active Alerts",
      value: alerts.length,
      subtitle: "Inventory alerts",
      icon: AlertTriangle,
      color: alerts.length > 0 ? "text-red-600" : "text-gray-600",
      alert: alerts.length > 0
    },
    {
      title: "Conversion Ready",
      value: commissaryItems.filter(item => item.current_stock > item.minimum_threshold).length,
      subtitle: "Items ready for conversion",
      icon: TrendingUp,
      color: "text-purple-600",
      alert: false
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index} className={metric.alert ? "border-orange-200" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Commissary Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Commissary Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {outOfStockCommissary.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Out of Stock</h4>
                  <div className="space-y-2">
                    {outOfStockCommissary.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="destructive">0 {item.unit}</Badge>
                      </div>
                    ))}
                    {outOfStockCommissary.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{outOfStockCommissary.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {lowStockCommissary.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-600 mb-2">Low Stock</h4>
                  <div className="space-y-2">
                    {lowStockCommissary.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-sm">{item.name}</span>
                        <Badge variant="warning">
                          {item.current_stock} {item.unit}
                        </Badge>
                      </div>
                    ))}
                    {lowStockCommissary.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{lowStockCommissary.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {outOfStockCommissary.length === 0 && lowStockCommissary.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All commissary items are well stocked
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Store Inventory Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Store Inventory Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {outOfStockStore.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Out of Stock</h4>
                  <div className="space-y-2">
                    {outOfStockStore.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-sm">{item.item}</span>
                        <Badge variant="destructive">0 {item.unit}</Badge>
                      </div>
                    ))}
                    {outOfStockStore.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{outOfStockStore.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {lowStockStore.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-600 mb-2">Low Stock</h4>
                  <div className="space-y-2">
                    {lowStockStore.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-sm">{item.item}</span>
                        <Badge variant="warning">
                          {item.stock_quantity} {item.unit}
                        </Badge>
                      </div>
                    ))}
                    {lowStockStore.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{lowStockStore.length - 3} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {outOfStockStore.length === 0 && lowStockStore.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All store items are well stocked
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {outOfStockStore.length > 0 && (
              <Button variant="outline" className="justify-start">
                <Factory className="h-4 w-4 mr-2" />
                Convert Items to Restock
              </Button>
            )}
            {lowStockCommissary.length > 0 && (
              <Button variant="outline" className="justify-start">
                <Package className="h-4 w-4 mr-2" />
                Order Commissary Supplies
              </Button>
            )}
            {alerts.length > 0 && (
              <Button variant="outline" className="justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Review Inventory Alerts
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
