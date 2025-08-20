import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Clock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { mapRecipeToInventory, checkIngredientAvailability } from '@/services/inventory/smartIngredientMapping';

interface SyncReport {
  totalProducts: number;
  productsWithRecipes: number;
  productsWithoutRecipes: string[];
  inventoryItems: number;
  categorizedItems: number;
  uncategorizedItems: string[];
  missingCosts: string[];
  syncPercentage: number;
}

export function ProductSyncValidator({ storeId }: { storeId: string }) {
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateSync = async () => {
    setIsValidating(true);
    try {
      // Get all active products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, category_id')
        .eq('store_id', storeId)
        .eq('is_active', true);

      // Get all recipes
      const { data: recipes } = await supabase
        .from('recipes')
        .select('product_id')
        .eq('store_id', storeId);

      // Get inventory items
      const { data: inventory } = await supabase
        .from('inventory_stock')
        .select('id, item, item_category, cost')
        .eq('store_id', storeId)
        .eq('is_active', true);

      const productIds = products?.map(p => p.id) || [];
      const recipeProductIds = recipes?.map(r => r.product_id) || [];
      
      const productsWithoutRecipes = products?.filter(p => 
        !recipeProductIds.includes(p.id)
      ).map(p => p.name) || [];

      const uncategorizedProducts = products?.filter(p => !p.category_id).map(p => p.name) || [];
      const uncategorizedInventory = inventory?.filter(i => !i.item_category).map(i => i.item) || [];
      const missingCosts = inventory?.filter(i => !i.cost || i.cost === 0).map(i => i.item) || [];

      const report: SyncReport = {
        totalProducts: products?.length || 0,
        productsWithRecipes: recipeProductIds.length,
        productsWithoutRecipes: [...productsWithoutRecipes, ...uncategorizedProducts],
        inventoryItems: inventory?.length || 0,
        categorizedItems: inventory?.filter(i => i.item_category).length || 0,
        uncategorizedItems: uncategorizedInventory,
        missingCosts,
        syncPercentage: Math.round(
          ((recipeProductIds.length / (products?.length || 1)) + 
           ((inventory?.filter(i => i.item_category).length || 0) / (inventory?.length || 1))) / 2 * 100
        )
      };

      setSyncReport(report);
      toast.success('Sync validation completed');
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate sync');
    } finally {
      setIsValidating(false);
    }
  };

  const getSyncStatus = (percentage: number) => {
    if (percentage >= 95) return { status: 'excellent', color: 'bg-green-500', icon: Check };
    if (percentage >= 85) return { status: 'good', color: 'bg-yellow-500', icon: Clock };
    return { status: 'needs attention', color: 'bg-red-500', icon: AlertCircle };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Product & Inventory Sync Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={validateSync} 
          disabled={isValidating}
          className="w-full"
        >
          {isValidating ? 'Validating...' : 'Run Sync Validation'}
        </Button>

        {syncReport && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${getSyncStatus(syncReport.syncPercentage).color}`} />
              <span className="font-medium">
                Sync Status: {syncReport.syncPercentage}% - {getSyncStatus(syncReport.syncPercentage).status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Products</h4>
                <div className="text-sm text-muted-foreground">
                  <div>Total: {syncReport.totalProducts}</div>
                  <div>With Recipes: {syncReport.productsWithRecipes}</div>
                  <div>Missing Recipes: {syncReport.productsWithoutRecipes.length}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Inventory</h4>
                <div className="text-sm text-muted-foreground">
                  <div>Total Items: {syncReport.inventoryItems}</div>
                  <div>Categorized: {syncReport.categorizedItems}</div>
                  <div>Missing Categories: {syncReport.uncategorizedItems.length}</div>
                </div>
              </div>
            </div>

            {syncReport.productsWithoutRecipes.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">Products Needing Attention</h4>
                <div className="flex flex-wrap gap-1">
                  {syncReport.productsWithoutRecipes.slice(0, 10).map(name => (
                    <Badge key={name} variant="destructive" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {syncReport.productsWithoutRecipes.length > 10 && (
                    <Badge variant="secondary">+{syncReport.productsWithoutRecipes.length - 10} more</Badge>
                  )}
                </div>
              </div>
            )}

            {syncReport.missingCosts.length > 0 && (
              <div>
                <h4 className="font-medium text-yellow-600 mb-2">Items Missing Costs</h4>
                <div className="flex flex-wrap gap-1">
                  {syncReport.missingCosts.slice(0, 10).map(name => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {syncReport.missingCosts.length > 10 && (
                    <Badge variant="secondary">+{syncReport.missingCosts.length - 10} more</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}