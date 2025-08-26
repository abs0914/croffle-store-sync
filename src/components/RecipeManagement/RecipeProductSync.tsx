import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Package,
  XCircle,
  Clock
} from 'lucide-react';
import { useRecipeProductIntegration } from '@/hooks/useRecipeProductIntegration';
import { RecipeStatusIndicator } from './RecipeStatusIndicator';

interface RecipeProductSyncProps {
  storeId: string;
  className?: string;
}

export const RecipeProductSync: React.FC<RecipeProductSyncProps> = ({
  storeId,
  className = ""
}) => {
  const {
    productStatuses,
    summary,
    isLoading,
    isSync,
    lastSyncTime,
    syncCatalog,
    createRecipes,
    refetch
  } = useRecipeProductIntegration(storeId);

  const handleSync = async () => {
    try {
      await syncCatalog();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleCreateRecipes = async () => {
    try {
      await createRecipes();
    } catch (error) {
      console.error('Create recipes failed:', error);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Sell</p>
                <p className="text-2xl font-bold text-green-600">{summary.readyToSell}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Setup Needed</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.setupNeeded}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Direct Products</p>
                <p className="text-2xl font-bold text-blue-600">{summary.directProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Missing Templates</p>
                <p className="text-2xl font-bold text-red-600">{summary.missingTemplates}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recipe-Product Management</CardTitle>
            <div className="flex items-center gap-2">
              {lastSyncTime && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </div>
              )}
              <Button
                onClick={handleSync}
                disabled={isSync || isLoading}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSync ? 'animate-spin' : ''}`} />
                {isSync ? 'Syncing...' : 'Sync Catalog'}
              </Button>
              <Button
                onClick={handleCreateRecipes}
                disabled={isLoading}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Missing Recipes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.needsAttention > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-800">
                    {summary.needsAttention} products need attention
                  </span>
                </div>
                <p className="text-sm text-yellow-700">
                  These products either need recipe setup or have missing templates. 
                  Use the sync function to automatically resolve issues.
                </p>
              </div>
            )}

            {/* Product Status List */}
            {productStatuses.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Product Status Overview</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {productStatuses
                      .filter(p => p.status === 'setup_needed' || p.status === 'missing_template')
                      .slice(0, 10)
                      .map(product => (
                        <div key={product.productId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium text-sm">{product.productName}</p>
                            {product.missingIngredients.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Missing: {product.missingIngredients.slice(0, 2).join(', ')}
                                {product.missingIngredients.length > 2 && ` +${product.missingIngredients.length - 2} more`}
                              </p>
                            )}
                          </div>
                          <RecipeStatusIndicator
                            status={product.status}
                            canProduce={product.canProduce}
                            availableIngredients={product.availableIngredients}
                            totalIngredients={product.totalIngredients}
                          />
                        </div>
                      ))}
                  </div>
                  {summary.needsAttention > 10 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Showing 10 of {summary.needsAttention} products that need attention
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};