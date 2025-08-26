import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Zap,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  MapPin,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Settings,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/format';

interface CommissaryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  minimum_threshold: number;
  unit: string;
  unit_cost: number;
  item_type: string;
  supplier_id?: string;
  last_purchase_date?: string;
  last_purchase_cost?: number;
  average_cost?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  is_active: boolean;
  ingredients: RecipeIngredient[];
}

interface RecipeIngredient {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
}

interface StockAlert {
  id: string;
  item_name: string;
  current_stock: number;
  minimum_threshold: number;
  severity: 'critical' | 'warning' | 'info';
  category: string;
}

interface ItemUsage {
  itemName: string;
  totalUsage: number;
  recipeCount: number;
  averageUsage: number;
  recipes: string[];
}

export const AdminCommissaryIntegrationTab: React.FC = () => {
  const [commissaryItems, setCommissaryItems] = useState<CommissaryItem[]>([]);
  const [recipeTemplates, setRecipeTemplates] = useState<RecipeTemplate[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [itemUsage, setItemUsage] = useState<ItemUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCommissaryItems(),
        loadRecipeTemplates(),
        generateStockAlerts(),
        analyzeItemUsage()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load commissary integration data');
    } finally {
      setLoading(false);
    }
  };

  const loadCommissaryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('commissary_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCommissaryItems(data || []);
    } catch (error) {
      console.error('Error loading commissary items:', error);
    }
  };

  const loadRecipeTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          ingredients:recipe_template_ingredients(*)
        `)
        .eq('is_active', true);

      if (error) throw error;
      setRecipeTemplates(data || []);
    } catch (error) {
      console.error('Error loading recipe templates:', error);
    }
  };

  const generateStockAlerts = async () => {
    const alerts: StockAlert[] = commissaryItems
      .filter(item => item.current_stock <= item.minimum_threshold)
      .map(item => ({
        id: item.id,
        item_name: item.name,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        severity: item.current_stock === 0 ? 'critical' : 
                 item.current_stock <= item.minimum_threshold * 0.5 ? 'warning' : 'info',
        category: item.category
      }));

    setStockAlerts(alerts);
  };

  const analyzeItemUsage = async () => {
    const usage: ItemUsage[] = [];
    const usageMap = new Map<string, ItemUsage>();

    recipeTemplates.forEach(template => {
      template.ingredients?.forEach(ingredient => {
        // Add null check for ingredient_name
        if (!ingredient.ingredient_name) return;
        
        const key = ingredient.ingredient_name.toLowerCase();
        if (usageMap.has(key)) {
          const existing = usageMap.get(key)!;
          existing.totalUsage += ingredient.quantity;
          existing.recipeCount += 1;
          existing.recipes.push(template.name);
        } else {
          usageMap.set(key, {
            itemName: ingredient.ingredient_name,
            totalUsage: ingredient.quantity,
            recipeCount: 1,
            averageUsage: ingredient.quantity,
            recipes: [template.name]
          });
        }
      });
    });

    // Calculate average usage
    usageMap.forEach(item => {
      item.averageUsage = item.totalUsage / item.recipeCount;
    });

    setItemUsage(Array.from(usageMap.values()));
  };

  const getItemUsage = (itemName: string): ItemUsage | undefined => {
    // Add null check for itemName
    if (!itemName) return undefined;
    
    return itemUsage.find(usage => 
      usage.itemName && usage.itemName.toLowerCase() === itemName.toLowerCase()
    );
  };

  const getUnusedItems = (): CommissaryItem[] => {
    return commissaryItems.filter(item => {
      const usage = getItemUsage(item.name);
      return !usage || usage.recipeCount === 0;
    });
  };

  const getMostUsedItems = (): ItemUsage[] => {
    return itemUsage
      .sort((a, b) => b.recipeCount - a.recipeCount)
      .slice(0, 10);
  };

  const getCriticalAlerts = (): StockAlert[] => {
    return stockAlerts.filter(alert => alert.severity === 'critical');
  };

  const getCategories = (): string[] => {
    const categories = new Set(commissaryItems.map(item => item.category));
    return Array.from(categories).sort();
  };

  const filteredItems = commissaryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValue = commissaryItems.reduce((sum, item) => 
    sum + (item.current_stock * item.unit_cost), 0
  );

  const lowStockItems = commissaryItems.filter(item => 
    item.current_stock <= item.minimum_threshold
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Commissary Integration</h3>
          <p className="text-sm text-muted-foreground">
            Monitor stock levels, usage patterns, and integration with recipe templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Configure Integration
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {getCriticalAlerts().length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Stock Alerts ({getCriticalAlerts().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getCriticalAlerts().slice(0, 3).map(alert => (
                <div key={alert.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{alert.item_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({alert.category})
                    </span>
                  </div>
                  <Badge variant="destructive">
                    {alert.current_stock} / {alert.minimum_threshold}
                  </Badge>
                </div>
              ))}
              {getCriticalAlerts().length > 3 && (
                <p className="text-sm text-muted-foreground">
                  ...and {getCriticalAlerts().length - 3} more items
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{commissaryItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recipe Templates</p>
                <p className="text-2xl font-bold">{recipeTemplates.length}</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage-analysis">Usage Analysis</TabsTrigger>
          <TabsTrigger value="stock-alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="integration-settings">Integration Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Categories</option>
              {getCategories().map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const usage = getItemUsage(item.name);
              const isLowStock = item.current_stock <= item.minimum_threshold;
              
              return (
                <Card key={item.id} className={isLowStock ? 'border-orange-200' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      {isLowStock && (
                        <Badge variant="destructive">Low Stock</Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Current Stock</p>
                        <p className="text-lg font-bold">{item.current_stock} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Unit Cost</p>
                        <p className="text-lg font-bold">{formatCurrency(item.unit_cost)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Min. Threshold</p>
                        <p className="text-sm">{item.minimum_threshold} {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Used in Recipes</p>
                        <p className="text-sm">{usage?.recipeCount || 0} recipes</p>
                      </div>
                    </div>
                    
                    {usage && usage.recipeCount > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Recipe Usage</p>
                        <div className="text-xs text-muted-foreground">
                          Avg: {usage.averageUsage.toFixed(1)} {item.unit} per recipe
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="usage-analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Used Items */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Items</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Items frequently used across recipe templates
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getMostUsedItems().map((item, index) => (
                    <div key={item.itemName} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.recipeCount} recipes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.totalUsage.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">
                          avg: {item.averageUsage.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Unused Items */}
            <Card>
              <CardHeader>
                <CardTitle>Unused Items</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Commissary items not used in any recipe template
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getUnusedItems().slice(0, 10).map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{item.current_stock} {item.unit}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unit_cost)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getUnusedItems().length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ...and {getUnusedItems().length - 10} more items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock-alerts" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {stockAlerts.map(alert => (
              <Card key={alert.id} className={
                alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                alert.severity === 'warning' ? 'border-orange-200 bg-orange-50' :
                'border-blue-200 bg-blue-50'
              }>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{alert.item_name}</h4>
                      <p className="text-sm text-muted-foreground">{alert.category}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'warning' ? 'secondary' : 'default'
                      }>
                        {alert.current_stock} / {alert.minimum_threshold}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.severity === 'critical' ? 'Out of Stock' :
                         alert.severity === 'warning' ? 'Low Stock' : 'Below Threshold'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integration-settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure how commissary inventory integrates with recipe templates
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Automatic Stock Deduction</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Automatically deduct commissary stock when recipes are used
                  </p>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Rules
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Cost Synchronization</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Keep recipe costs updated with commissary item prices
                  </p>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Costs
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Stock Alerts</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Configure thresholds and notification preferences
                  </p>
                  <Button variant="outline">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Alert Settings
                  </Button>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Usage Analytics</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate reports on ingredient usage patterns
                  </p>
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
