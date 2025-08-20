import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  RefreshCw,
  CheckCircle,
  AlarmClock
} from 'lucide-react';
import { InventoryItemCategory } from '@/types/inventory';

interface CategoryDistribution {
  category: InventoryItemCategory;
  count: number;
  percentage: number;
  color: string;
}

interface HealthMetrics {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  lowStockItems: number;
  categoryDistribution: CategoryDistribution[];
  recentlyUpdated: number;
  missingCategories: string[];
  duplicateItems: Array<{ item: string; count: number; stores: string[] }>;
  healthScore: number;
}

const CATEGORY_COLORS = {
  base_ingredient: '#8b5cf6',
  classic_sauce: '#3b82f6', 
  premium_sauce: '#1d4ed8',
  classic_topping: '#10b981',
  premium_topping: '#059669',
  packaging: '#f59e0b',
  biscuit: '#ef4444'
};

const CATEGORY_LABELS = {
  base_ingredient: 'Base Ingredients',
  classic_sauce: 'Classic Sauces',
  premium_sauce: 'Premium Sauces',
  classic_topping: 'Classic Toppings', 
  premium_topping: 'Premium Toppings',
  packaging: 'Packaging',
  biscuit: 'Biscuits'
};

export const InventoryHealthDashboard: React.FC = () => {
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);

  const loadHealthMetrics = async () => {
    setIsLoading(true);
    try {
      // Get all stores first
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (storesError) throw storesError;
      setStores(storesData || []);

      // Build query based on selected store
      let query = supabase
        .from('inventory_stock')
        .select('*');

      if (selectedStore !== 'all') {
        query = query.eq('store_id', selectedStore);
      }

      const { data: inventory, error: inventoryError } = await query;
      if (inventoryError) throw inventoryError;

      if (!inventory) {
        setHealthMetrics(null);
        return;
      }

      // Calculate category distribution
      const categoryMap = new Map<InventoryItemCategory, number>();
      let activeCount = 0;
      let lowStockCount = 0;
      let recentlyUpdatedCount = 0;
      const missingCategoriesSet = new Set<string>();
      const duplicateMap = new Map<string, Array<{ store_id: string; store_name?: string }>>();

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      inventory.forEach(item => {
        // Category distribution
        if (item.item_category) {
          categoryMap.set(item.item_category, (categoryMap.get(item.item_category) || 0) + 1);
        } else {
          missingCategoriesSet.add(item.item);
        }

        // Active items
        if (item.is_active) activeCount++;

        // Low stock items (stock below minimum threshold or below 10 if no threshold set)
        const threshold = item.minimum_threshold || 10;
        if (item.stock_quantity < threshold) lowStockCount++;

        // Recently updated items
        if (new Date(item.updated_at || item.created_at) > oneDayAgo) {
          recentlyUpdatedCount++;
        }

        // Track potential duplicates
        const itemKey = item.item.toLowerCase().trim();
        if (!duplicateMap.has(itemKey)) {
          duplicateMap.set(itemKey, []);
        }
        duplicateMap.get(itemKey)!.push({ 
          store_id: item.store_id,
          store_name: storesData?.find(s => s.id === item.store_id)?.name 
        });
      });

      // Process category distribution
      const totalItems = inventory.length;
      const categoryDistribution: CategoryDistribution[] = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalItems) * 100),
        color: CATEGORY_COLORS[category] || '#6b7280'
      })).sort((a, b) => b.count - a.count);

      // Find duplicates (same item name in multiple stores or multiple entries)
      const duplicates = Array.from(duplicateMap.entries())
        .filter(([_, stores]) => stores.length > 1)
        .map(([item, stores]) => ({
          item,
          count: stores.length,
          stores: [...new Set(stores.map(s => s.store_name || s.store_id))]
        }))
        .slice(0, 10);

      // Calculate health score (0-100)
      let healthScore = 100;
      
      // Deduct points for issues
      const inactivePercentage = ((totalItems - activeCount) / totalItems) * 100;
      const lowStockPercentage = (lowStockCount / totalItems) * 100;
      const missingCategoryPercentage = (missingCategoriesSet.size / totalItems) * 100;
      
      healthScore -= Math.min(inactivePercentage * 0.5, 20); // Max 20 points for inactive items
      healthScore -= Math.min(lowStockPercentage * 0.3, 15); // Max 15 points for low stock
      healthScore -= Math.min(missingCategoryPercentage * 0.8, 25); // Max 25 points for missing categories
      healthScore -= Math.min(duplicates.length * 2, 20); // Max 20 points for duplicates

      const metrics: HealthMetrics = {
        totalItems,
        activeItems: activeCount,
        inactiveItems: totalItems - activeCount,
        lowStockItems: lowStockCount,
        categoryDistribution,
        recentlyUpdated: recentlyUpdatedCount,
        missingCategories: Array.from(missingCategoriesSet).slice(0, 20),
        duplicateItems: duplicates,
        healthScore: Math.max(Math.round(healthScore), 0)
      };

      setHealthMetrics(metrics);
      toast.success('Inventory health metrics loaded');
      
    } catch (error) {
      console.error('Error loading health metrics:', error);
      toast.error('Failed to load inventory health metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHealthMetrics();
  }, [selectedStore]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <ShieldCheck className="h-8 w-8 text-green-600" />;
    if (score >= 75) return <AlarmClock className="h-8 w-8 text-yellow-600" />;
    return <AlertTriangle className="h-8 w-8 text-red-600" />;
  };

  if (!healthMetrics) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading inventory health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Health Dashboard</h2>
          <p className="text-muted-foreground">Monitor inventory organization and category distribution</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedStore} 
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Stores</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <Button 
            onClick={loadHealthMetrics}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Score Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overall Health Score</p>
              <p className={`text-4xl font-bold ${getHealthColor(healthMetrics.healthScore)}`}>
                {healthMetrics.healthScore}/100
              </p>
              <Progress value={healthMetrics.healthScore} className="mt-2 w-64" />
            </div>
            {getHealthIcon(healthMetrics.healthScore)}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{healthMetrics.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {healthMetrics.activeItems} active, {healthMetrics.inactiveItems} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{healthMetrics.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Need restocking attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missing Categories</p>
                <p className="text-2xl font-bold text-yellow-600">{healthMetrics.missingCategories.length}</p>
              </div>
              <AlarmClock className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Items need categorization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recently Updated</p>
                <p className="text-2xl font-bold text-green-600">{healthMetrics.recentlyUpdated}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Updated in last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={healthMetrics.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ category, percentage }) => `${CATEGORY_LABELS[category]}: ${percentage}%`}
                >
                  {healthMetrics.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthMetrics.categoryDistribution.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{CATEGORY_LABELS[category.category]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{category.count} items</Badge>
                    <span className="text-sm text-muted-foreground">{category.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issues & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missing Categories */}
        {healthMetrics.missingCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Items Missing Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {healthMetrics.missingCategories.map((item, index) => (
                  <div key={index} className="p-2 bg-yellow-50 rounded border">
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>
              {healthMetrics.missingCategories.length > 20 && (
                <p className="text-sm text-muted-foreground mt-2">
                  ...and {healthMetrics.missingCategories.length - 20} more items
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Duplicate Items */}
        {healthMetrics.duplicateItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlarmClock className="h-5 w-5 text-blue-600" />
                Potential Duplicates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {healthMetrics.duplicateItems.map((duplicate, index) => (
                  <div key={index} className="p-2 bg-blue-50 rounded border">
                    <p className="font-medium">{duplicate.item}</p>
                    <p className="text-sm text-muted-foreground">
                      {duplicate.count} entries across: {duplicate.stores.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthMetrics.missingCategories.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Action needed:</strong> {healthMetrics.missingCategories.length} items need category assignment. 
                  Use the Category Validator tool to fix these.
                </AlertDescription>
              </Alert>
            )}
            
            {healthMetrics.lowStockItems > 0 && (
              <Alert>
                <AlarmClock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Stock alert:</strong> {healthMetrics.lowStockItems} items are running low. 
                  Consider restocking to prevent sales disruption.
                </AlertDescription>
              </Alert>
            )}

            {healthMetrics.duplicateItems.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Optimization:</strong> {healthMetrics.duplicateItems.length} potential duplicates found. 
                  Review and consolidate to improve system efficiency.
                </AlertDescription>
              </Alert>
            )}

            {healthMetrics.healthScore >= 90 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Excellent!</strong> Your inventory is well-organized. 
                  Keep monitoring for continued optimal performance.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};