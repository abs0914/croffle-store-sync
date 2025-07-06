
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, Database, RefreshCw } from 'lucide-react';

export const RecipeDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      // Check recipe templates
      const { data: templates, error: templatesError } = await supabase
        .from('recipe_templates')
        .select('id, name, is_active')
        .limit(10);

      // Check deployed recipes
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, name, store_id, approval_status, is_active')
        .limit(10);

      // Check recipe template ingredients
      const { data: templateIngredients, error: templateIngredientsError } = await supabase
        .from('recipe_template_ingredients')
        .select('id, recipe_template_id, ingredient_name')
        .limit(10);

      // Check recipe ingredients
      const { data: recipeIngredients, error: recipeIngredientsError } = await supabase
        .from('recipe_ingredients')
        .select('id, recipe_id')
        .limit(10);

      // Check stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name, is_active')
        .limit(10);

      setDebugInfo({
        templates: {
          count: templates?.length || 0,
          data: templates,
          error: templatesError
        },
        recipes: {
          count: recipes?.length || 0,
          data: recipes,
          error: recipesError
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
          error: storesError
        }
      });
    } catch (error) {
      console.error('Debug diagnostics failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Recipe Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <AlertCircle className="h-4 w-4 mr-2" />
          )}
          Run Database Diagnostics
        </Button>

        {debugInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 border rounded">
                <div className="font-semibold">Recipe Templates</div>
                <div className="text-2xl">{debugInfo.templates.count}</div>
                {debugInfo.templates.error && (
                  <div className="text-red-500 text-sm">Error: {debugInfo.templates.error.message}</div>
                )}
              </div>
              
              <div className="p-3 border rounded">
                <div className="font-semibold">Deployed Recipes</div>
                <div className="text-2xl">{debugInfo.recipes.count}</div>
                {debugInfo.recipes.error && (
                  <div className="text-red-500 text-sm">Error: {debugInfo.recipes.error.message}</div>
                )}
              </div>
              
              <div className="p-3 border rounded">
                <div className="font-semibold">Template Ingredients</div>
                <div className="text-2xl">{debugInfo.templateIngredients.count}</div>
                {debugInfo.templateIngredients.error && (
                  <div className="text-red-500 text-sm">Error: {debugInfo.templateIngredients.error.message}</div>
                )}
              </div>
              
              <div className="p-3 border rounded">
                <div className="font-semibold">Recipe Ingredients</div>
                <div className="text-2xl">{debugInfo.recipeIngredients.count}</div>
                {debugInfo.recipeIngredients.error && (
                  <div className="text-red-500 text-sm">Error: {debugInfo.recipeIngredients.error.message}</div>
                )}
              </div>
              
              <div className="p-3 border rounded">
                <div className="font-semibold">Active Stores</div>
                <div className="text-2xl">{debugInfo.stores.count}</div>
                {debugInfo.stores.error && (
                  <div className="text-red-500 text-sm">Error: {debugInfo.stores.error.message}</div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Sample Data:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
