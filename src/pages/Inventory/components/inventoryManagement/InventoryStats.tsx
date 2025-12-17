
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';
import { fetchInventoryStock } from '@/services/inventoryManagement/recipeService';
import { InventoryStock } from '@/types/inventoryManagement';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type StockFilterType = 'all' | 'low-stock' | 'out-of-stock';

interface InventoryStatsProps {
  storeId: string;
  activeFilter?: StockFilterType;
  onFilterChange?: (filter: StockFilterType) => void;
}

export function InventoryStats({ storeId, activeFilter = 'all', onFilterChange }: InventoryStatsProps) {
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

  const totalItems = inventoryItems.length;
  const lowStockItems = inventoryItems.filter(item => item.stock_quantity < 10 && item.stock_quantity > 0).length;
  const outOfStockItems = inventoryItems.filter(item => item.stock_quantity === 0).length;
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.stock_quantity * (item.cost || 0)), 0);

  const handleCardClick = (filterType: StockFilterType) => {
    if (onFilterChange) {
      // Toggle off if clicking the same filter
      onFilterChange(activeFilter === filterType ? 'all' : filterType);
    }
  };

  const stats = [
    {
      title: "Total Products",
      value: totalItems,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      filterType: 'all' as StockFilterType,
      clickable: false
    },
    {
      title: "Low Stock",
      value: lowStockItems,
      icon: AlertTriangle,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      filterType: 'low-stock' as StockFilterType,
      clickable: true
    },
    {
      title: "Out of Stock",
      value: outOfStockItems,
      icon: ShoppingCart,
      color: "text-red-600",
      bgColor: "bg-red-50",
      filterType: 'out-of-stock' as StockFilterType,
      clickable: true
    },
    {
      title: "Total Value",
      value: `₱${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      filterType: 'all' as StockFilterType,
      clickable: false
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card 
          key={stat.title}
          className={cn(
            stat.clickable && "cursor-pointer transition-all hover:shadow-md",
            stat.clickable && activeFilter === stat.filterType && "ring-2 ring-primary ring-offset-2"
          )}
          onClick={() => stat.clickable && handleCardClick(stat.filterType)}
        >
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
  );
}
