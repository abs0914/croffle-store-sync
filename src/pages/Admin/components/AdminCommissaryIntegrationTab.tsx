
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Link2, 
  Warehouse, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Package,
  TrendingUp,
  Clock,
  Download,
  ChefHat
} from 'lucide-react';
import { fetchCommissaryInventory } from '@/services/inventoryManagement/commissaryInventoryService';
import { supabase } from '@/integrations/supabase/client';
import { CommissaryInventoryItem } from '@/types/inventoryManagement';
import { toast } from 'sonner';

interface RecipeIngredient {
  commissary_item_id: string;
  commissary_item_name: string;
  recipe_count: number;
}

export const AdminCommissaryIntegrationTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommissaryData();
  }, []);

  const loadCommissaryData = async () => {
    try {
      setLoading(true);
      
      // Fetch commissary inventory
      const inventory = await fetchCommissaryInventory();
      setCommissaryItems(inventory);

      // Fetch recipe ingredients usage data
      const { data: recipeIngredientsData } = await supabase
        .from('recipe_template_ingredients')
        .select(`
          commissary_item_id,
          commissary_item_name,
          recipe_template_id
        `);

      if (recipeIngredientsData) {
        // Group by commissary item and count unique recipes
        const ingredientUsage = recipeIngredientsData.reduce((acc, item) => {
          const key = item.commissary_item_id || item.commissary_item_name;
          if (!acc[key]) {
            acc[key] = {
              commissary_item_id: item.commissary_item_id,
              commissary_item_name: item.commissary_item_name,
              recipes: new Set()
            };
          }
          acc[key].recipes.add(item.recipe_template_id);
          return acc;
        }, {} as any);

        const usageArray = Object.values(ingredientUsage).map((item: any) => ({
          commissary_item_id: item.commissary_item_id,
          commissary_item_name: item.commissary_item_name,
          recipe_count: item.recipes.size
        }));

        setRecipeIngredients(usageArray);
      }
    } catch (error) {
      console.error('Error loading commissary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReference = () => {
    const csvContent = [
      'Item Name,Category,Unit,Current Stock,Unit Cost',
      ...commissaryItems.map(item => 
        `"${item.name}","${item.category}","${item.unit}",${item.current_stock},${item.unit_cost || 0}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commissary_items_reference.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Reference file downloaded');
  };

  const getItemUsage = (itemId: string, itemName: string) => {
    const usage = recipeIngredients.find(
      ri => ri.commissary_item_id === itemId || ri.commissary_item_name.toLowerCase() === itemName.toLowerCase()
    );
    return usage?.recipe_count || 0;
  };

  const getStatusBadge = (item: CommissaryInventoryItem) => {
    if (item.current_stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.current_stock <= item.minimum_threshold) {
      return <Badge variant="destructive" className="bg-amber-100 text-amber-800">Low Stock</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  // Calculate integration metrics
  const totalCommissaryItems = commissaryItems.length;
  const itemsUsedInRecipes = recipeIngredients.length;
  const unusedItems = totalCommissaryItems - itemsUsedInRecipes;
  const lowStockItems = commissaryItems.filter(item => 
    item.current_stock <= item.minimum_threshold && item.current_stock > 0
  ).length;
  const outOfStockItems = commissaryItems.filter(item => item.current_stock === 0).length;
  const averageCostPerUnit = commissaryItems.length > 0 
    ? commissaryItems.reduce((sum, item) => sum + (item.unit_cost || 0), 0) / commissaryItems.length 
    : 0;

  const filteredItems = commissaryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading commissary integration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Integration Overview */}
      <Alert>
        <Link2 className="h-4 w-4" />
        <AlertDescription>
          Monitor commissary inventory integration with recipe templates. 
          Ensure all recipe ingredients are available and properly costed.
        </AlertDescription>
      </Alert>

      {/* Quick Reference Section for Recipe CSV Uploads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Recipe CSV Reference ({commissaryItems.length} items)
              </CardTitle>
              <CardDescription>
                Download reference for recipe CSV uploads - use these exact names in your recipe files
              </CardDescription>
            </div>
            <Button onClick={downloadReference} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download CSV Reference
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Recipe Upload Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use the exact item names shown below in your CSV</li>
              <li>• Names are case-sensitive and must match exactly</li>
              <li>• Download the reference file to see all available items</li>
              <li>• Check that items have sufficient stock if needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Integration Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalCommissaryItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Used in Recipes</p>
                <p className="text-2xl font-bold">{itemsUsedInRecipes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm text-muted-foreground">Unused Items</p>
                <p className="text-2xl font-bold">{unusedItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Low/Out Stock</p>
                <p className="text-2xl font-bold">{lowStockItems + outOfStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Cost/Unit</p>
                <p className="text-2xl font-bold">₱{averageCostPerUnit.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissary Items List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Commissary Inventory Integration
              </CardTitle>
              <CardDescription>
                Monitor commissary items used in recipe templates and their availability
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button onClick={loadCommissaryData} variant="outline" size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const usageCount = getItemUsage(item.id, item.name);
              return (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.category.replace('_', ' ')} • Used in {usageCount} recipe{usageCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {item.current_stock} {item.unit}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ₱{(item.unit_cost || 0).toFixed(2)}/{item.unit}
                      </p>
                    </div>
                    
                    {getStatusBadge(item)}
                    
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No items found matching your search.' : 'No commissary items found.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integration Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Actions</CardTitle>
          <CardDescription>
            Manage commissary inventory integration and synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={loadCommissaryData}>
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Sync Inventory</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">Check Missing Items</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">Update Costs</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
