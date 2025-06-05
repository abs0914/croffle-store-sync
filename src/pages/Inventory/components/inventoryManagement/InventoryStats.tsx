
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchInventoryItems, getStockLevel } from "@/services/inventoryManagement/inventoryItemService";
import { InventoryItem } from "@/types/inventoryManagement";
import { Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface InventoryStatsProps {
  storeId: string;
}

export function InventoryStats({ storeId }: InventoryStatsProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      const data = await fetchInventoryItems(storeId);
      setItems(data);
      setLoading(false);
    };

    loadItems();
  }, [storeId]);

  const stats = {
    total: items.length,
    good: items.filter(item => getStockLevel(item.current_stock, item.minimum_threshold) === 'good').length,
    low: items.filter(item => getStockLevel(item.current_stock, item.minimum_threshold) === 'low').length,
    out: items.filter(item => getStockLevel(item.current_stock, item.minimum_threshold) === 'out').length,
  };

  const statsCards = [
    {
      title: "Total Items",
      value: stats.total,
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Good Stock",
      value: stats.good,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Low Stock",
      value: stats.low,
      icon: AlertTriangle,
      color: "text-yellow-600"
    },
    {
      title: "Out of Stock",
      value: stats.out,
      icon: XCircle,
      color: "text-red-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
