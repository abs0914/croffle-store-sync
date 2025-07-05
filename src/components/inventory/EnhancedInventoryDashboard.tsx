import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SmartReorderingSystem } from './SmartReorderingSystem';
import { StockMovementTracker } from './StockMovementTracker';

interface InventoryStats {
  totalItems: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  averageStockLevel: number;
}

interface CategoryStats {
  category: string;
  itemCount: number;
  stockLevel: number;
  value: number;
}

interface EnhancedInventoryDashboardProps {
  storeId: string;
}

export function EnhancedInventoryDashboard({ storeId }: EnhancedInventoryDashboardProps) {
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    inStockItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
    averageStockLevel: 0
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchInventoryStats();
      // Set up real-time updates
      const channel = supabase
        .channel('inventory-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory_stock',
            filter: `store_id=eq.${storeId}`
          },
          () => {
            fetchInventoryStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [storeId]);

  const fetchInventoryStats = async () => {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) throw error;

      if (!inventory) return;

      // Calculate overall stats
      const totalItems = inventory.length;
      const inStockItems = inventory.filter(item => item.stock_quantity > (item.minimum_threshold || 10)).length;
      const lowStockItems = inventory.filter(item => 
        item.stock_quantity <= (item.minimum_threshold || 10) && item.stock_quantity > 0
      ).length;
      const outOfStockItems = inventory.filter(item => item.stock_quantity <= 0).length;
      const totalValue = inventory.reduce((sum, item) => sum + (item.stock_quantity * (item.cost || 0)), 0);
      const averageStockLevel = inventory.length > 0 
        ? inventory.reduce((sum, item) => sum + item.stock_quantity, 0) / inventory.length 
        : 0;

      setStats({
        totalItems,
        inStockItems,
        lowStockItems,
        outOfStockItems,
        totalValue,
        averageStockLevel
      });

      // Calculate category stats (simplified - group by first word of item name)
      const categoryMap = new Map<string, { count: number; stock: number; value: number }>();
      
      inventory.forEach(item => {
        const category = item.item.split(' ')[0] || 'Other';
        const existing = categoryMap.get(category) || { count: 0, stock: 0, value: 0 };
        categoryMap.set(category, {
          count: existing.count + 1,
          stock: existing.stock + item.stock_quantity,
          value: existing.value + (item.stock_quantity * (item.cost || 0))
        });
      });

      const categoryStatsArray: CategoryStats[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          itemCount: data.count,
          stockLevel: data.stock,
          value: data.value
        }))
        .sort((a, b) => b.value - a.value);

      setCategoryStats(categoryStatsArray);
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthPercentage = () => {
    if (stats.totalItems === 0) return 0;
    return Math.round((stats.inStockItems / stats.totalItems) * 100);
  };

  const getHealthColor = () => {
    const percentage = getHealthPercentage();
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Health</p>
                <p className="text-2xl font-bold">{getHealthPercentage()}%</p>
                <Progress 
                  value={getHealthPercentage()} 
                  className="mt-2" 
                />
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Alert</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">₱{stats.totalValue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reordering">Smart Reordering</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>In Stock</span>
                  </div>
                  <Badge variant="secondary">{stats.inStockItems}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Low Stock</span>
                  </div>
                  <Badge variant="outline">{stats.lowStockItems}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Out of Stock</span>
                  </div>
                  <Badge variant="destructive">{stats.outOfStockItems}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Average Stock Level</span>
                  <span className="font-mono">{stats.averageStockLevel.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Portfolio Value</span>
                  <span className="font-mono">₱{stats.totalValue.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Items Needing Attention</span>
                  <span className="font-mono">{stats.lowStockItems + stats.outOfStockItems}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reordering">
          <SmartReorderingSystem storeId={storeId} />
        </TabsContent>

        <TabsContent value="movements">
          <StockMovementTracker storeId={storeId} />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryStats.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.itemCount} items
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₱{category.value.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.stockLevel} units
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}