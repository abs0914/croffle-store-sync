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
      const {
        data: templates,
        error: templatesError
      } = await supabase.from('recipe_templates').select('id, name, is_active').limit(10);

      // Check deployed recipes
      const {
        data: recipes,
        error: recipesError
      } = await supabase.from('recipes').select('id, name, store_id, approval_status, is_active').limit(10);

      // Check recipe template ingredients
      const {
        data: templateIngredients,
        error: templateIngredientsError
      } = await supabase.from('recipe_template_ingredients').select('id, recipe_template_id, ingredient_name').limit(10);

      // Check recipe ingredients
      const {
        data: recipeIngredients,
        error: recipeIngredientsError
      } = await supabase.from('recipe_ingredients').select('id, recipe_id').limit(10);

      // Check stores
      const {
        data: stores,
        error: storesError
      } = await supabase.from('stores').select('id, name, is_active').limit(10);
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
  return <Card className="mt-4">
      
      
    </Card>;
};