
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Database, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const RecipeDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log('Running comprehensive diagnostics...');

      // Check recipe templates
      const { data: templates, error: templatesError } = await supabase
        .from('recipe_templates')
        .select('id, name, is_active, category_name, created_at')
        .order('created_at', { ascending: false });

      // Check deployed recipes with detailed info
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select(`
          id, 
          name, 
          store_id, 
          approval_status, 
          is_active, 
          created_at,
          product_id,
          stores:store_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      // Check recipe template ingredients
      const { data: templateIngredients, error: templateIngredientsError } = await supabase
        .from('recipe_template_ingredients')
        .select('id, recipe_template_id, ingredient_name, commissary_item_name')
        .limit(20);

      // Check recipe ingredients
      const { data: recipeIngredients, error: recipeIngredientsError } = await supabase
        .from('recipe_ingredients')
        .select('id, recipe_id, inventory_stock_id, quantity')
        .limit(20);

      // Check stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name, is_active');

      // Check product catalog entries
      const { data: productCatalog, error: catalogError } = await supabase
        .from('product_catalog')
        .select('id, product_name, store_id, recipe_id, is_available')
        .limit(20);

      // Check products table
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, store_id, sku')
        .limit(20);

      // Analyze duplicates
      const duplicateAnalysis = recipes ? recipes.reduce((acc: any, recipe: any) => {
        const key = `${recipe.name}-${recipe.store_id}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(recipe);
        return acc;
      }, {}) : {};

      const duplicates = Object.entries(duplicateAnalysis).filter(([_, recipes]: [string, any]) => recipes.length > 1);

      setDebugInfo({
        templates: {
          count: templates?.length || 0,
          data: templates,
          error: templatesError,
          active: templates?.filter(t => t.is_active).length || 0
        },
        recipes: {
          count: recipes?.length || 0,
          data: recipes,
          error: recipesError,
          byStore: recipes ? recipes.reduce((acc: any, recipe: any) => {
            const storeId = recipe.store_id;
            if (!acc[storeId]) {
              acc[storeId] = {
                storeName: recipe.stores?.name || 'Unknown',
                recipes: []
              };
            }
            acc[storeId].recipes.push(recipe);
            return acc;
          }, {}) : {},
          byStatus: recipes ? recipes.reduce((acc: any, recipe: any) => {
            const status = recipe.approval_status || 'no_status';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}) : {}
        },
        templateIngredients: {
          count: templateIngredients?.length || 0,
          data: templateIngredients,
          error: templateIngredientsError
        },
        recipeIngredients: {
          count: recipeIngredients?.length || 0,
          data: recipeIngredients,
          error: recipeIngredientsError
        },
        stores: {
          count: stores?.length || 0,
          data: stores,
          error: storesError,
          active: stores?.filter(s => s.is_active).length || 0
        },
        productCatalog: {
          count: productCatalog?.length || 0,
          data: productCatalog,
          error: catalogError
        },
        products: {
          count: products?.length || 0,
          data: products,
          error: productsError
        },
        duplicates: {
          count: duplicates.length,
          details: duplicates
        },
        analysis: {
          recipesWithoutProducts: recipes?.filter(r => !r.product_id).length || 0,
          recipesWithProducts: recipes?.filter(r => r.product_id).length || 0,
          activeRecipes: recipes?.filter(r => r.is_active).length || 0,
          inactiveRecipes: recipes?.filter(r => !r.is_active).length || 0
        }
      });

      console.log('Diagnostics complete:', debugInfo);
    } catch (error) {
      console.error('Debug diagnostics failed:', error);
      setDebugInfo({ error: error });
    } finally {
      setIsLoading(false);
    }
  };

  if (!debugInfo) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Recipe Deployment Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Comprehensive Diagnostics
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Recipe Deployment Diagnostics
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </Button>
            <Button onClick={runDiagnostics} disabled={isLoading} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Templates</div>
            <div className="text-2xl font-bold">{debugInfo.templates.count}</div>
            <div className="text-xs text-green-600">
              {debugInfo.templates.active} active
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Deployed Recipes</div>
            <div className="text-2xl font-bold">{debugInfo.recipes.count}</div>
            <div className="text-xs text-blue-600">
              {debugInfo.analysis.activeRecipes} active
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Stores</div>
            <div className="text-2xl font-bold">{debugInfo.stores.count}</div>
            <div className="text-xs text-green-600">
              {debugInfo.stores.active} active
            </div>
          </div>
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-muted-foreground">Duplicates</div>
            <div className="text-2xl font-bold text-red-600">{debugInfo.duplicates.count}</div>
            <div className="text-xs text-red-600">
              duplicate sets
            </div>
          </div>
        </div>

        {/* Issues Found */}
        {(debugInfo.duplicates.count > 0 || debugInfo.analysis.recipesWithoutProducts > 0) && (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-800">Issues Detected</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {debugInfo.duplicates.count > 0 && (
                <li>• {debugInfo.duplicates.count} duplicate recipe sets found</li>
              )}
              {debugInfo.analysis.recipesWithoutProducts > 0 && (
                <li>• {debugInfo.analysis.recipesWithoutProducts} recipes without product links</li>
              )}
            </ul>
          </div>
        )}

        {/* Recipe Status Breakdown */}
        <div className="space-y-2">
          <h4 className="font-semibold">Recipe Status Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(debugInfo.recipes.byStatus).map(([status, count]: [string, any]) => (
              <Badge key={status} variant="outline" className="justify-center p-2">
                {status}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* Store Breakdown */}
        {isExpanded && (
          <div className="space-y-2">
            <h4 className="font-semibold">Recipes by Store</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(debugInfo.recipes.byStore).map(([storeId, storeData]: [string, any]) => (
                <div key={storeId} className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">{storeData.storeName}</span>
                  <Badge variant="secondary">{storeData.recipes.length} recipes</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Duplicate Details */}
        {debugInfo.duplicates.count > 0 && isExpanded && (
          <div className="space-y-2">
            <h4 className="font-semibold text-red-600">Duplicate Recipe Details</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {debugInfo.duplicates.details.map(([key, recipes]: [string, any]) => (
                <div key={key} className="p-2 border border-red-200 rounded bg-red-50">
                  <div className="text-sm font-medium text-red-800">
                    {recipes[0].name} (Store: {recipes[0].stores?.name})
                  </div>
                  <div className="text-xs text-red-600">
                    {recipes.length} duplicates: {recipes.map((r: any) => r.id.substring(0, 8)).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Data (if expanded) */}
        {isExpanded && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">Raw Debug Data</summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};
