
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { fetchInventoryStock } from '@/services/inventoryManagement/recipeService';
import { InventoryStock } from '@/types/inventoryManagement';
import { toast } from 'sonner';

interface ProductionDashboardProps {
  storeId: string;
}

export function ProductionDashboard({ storeId }: ProductionDashboardProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInventoryItems();
  }, [storeId]);

  const loadInventoryItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInventoryStock(storeId);
      // Ensure cost property is defined for all items
      const itemsWithCost = data.map(item => ({
        ...item,
        cost: item.cost ?? 0
      }));
      setInventoryItems(itemsWithCost);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setIsLoading(false);
    }
  };

  const lowStockItems = inventoryItems.filter(item => item.stock_quantity < 10 && item.stock_quantity > 0);
  const outOfStockItems = inventoryItems.filter(item => item.stock_quantity === 0);
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.stock_quantity * (item.cost || 0)), 0);

  const stats = [
    {
      title: "Total Inventory Items",
      value: inventoryItems.length,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Low Stock Alerts",
      value: lowStockItems.length,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Out of Stock",
      value: outOfStockItems.length,
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Total Inventory Value",
      value: `₱${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50"
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Production Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your store's inventory and production status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <span className="font-medium">{item.item}</span>
                    <span className="text-sm text-muted-foreground ml-2">({item.unit})</span>
                  </div>
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                    {item.stock_quantity} remaining
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Out of Stock Alerts */}
      {outOfStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              Out of Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outOfStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <span className="font-medium">{item.item}</span>
                    <span className="text-sm text-muted-foreground ml-2">({item.unit})</span>
                  </div>
                  <Badge variant="destructive">
                    Out of Stock
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {inventoryItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No inventory data available</h3>
            <p className="text-muted-foreground">
              Inventory items will appear here once they are added to your store.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
