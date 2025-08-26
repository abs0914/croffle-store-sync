
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { InventoryBasedIngredientForm } from '@/components/recipe/InventoryBasedIngredientForm';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/types';
import { supabase } from '@/integrations/supabase/client';

interface InventoryIngredient {
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface RecipeTemplateIngredientsProps {
  ingredients: RecipeTemplateIngredientInput[];
  setIngredients: React.Dispatch<React.SetStateAction<RecipeTemplateIngredientInput[]>>;
  storeId?: string;
}

export const RecipeTemplateIngredients: React.FC<RecipeTemplateIngredientsProps> = ({
  ingredients,
  setIngredients,
  storeId
}) => {
  // Convert ingredients to inventory format
  const inventoryIngredients = useMemo(() => {
    return ingredients.map(ing => ({
      inventory_stock_id: ing.inventory_stock_id || '',
      ingredient_name: ing.ingredient_name || '',
      quantity: ing.quantity || 1,
      unit: ing.unit || 'pieces',
      cost_per_unit: ing.cost_per_unit || 0
    }));
  }, [ingredients]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    return inventoryIngredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
  }, [inventoryIngredients]);

  // Calculate ingredient availability status
  const ingredientStatus = useMemo(() => {
    const available = inventoryIngredients.filter(ing => 
      ing.ingredient_name && ing.quantity > 0 && ing.cost_per_unit > 0
    ).length;
    const total = inventoryIngredients.length;
    
    let status: 'complete' | 'partial' | 'empty' = 'empty';
    if (available === total && total > 0) status = 'complete';
    else if (available > 0) status = 'partial';
    
    return { available, total, status };
  }, [inventoryIngredients]);

  // Sync changes back to parent
  const syncToParent = useCallback((updatedIngredients: InventoryIngredient[]) => {
    console.log('🔄 Syncing to parent, ingredients:', updatedIngredients);
    const converted = updatedIngredients.map(ing => ({
      ingredient_name: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      inventory_stock_id: ing.inventory_stock_id,
      commissary_item_id: null,
      location_type: 'all' as const,
      supports_fractional: false,
      notes: ''
    }));
    console.log('📤 Converted ingredients for parent:', converted);
    setIngredients(converted);
  }, [setIngredients]);

  const addIngredient = useCallback(() => {
    const newIngredient: InventoryIngredient = {
      inventory_stock_id: '',
      ingredient_name: '',
      quantity: 1,
      unit: 'pieces',
      cost_per_unit: 0
    };
    const updatedIngredients = [...inventoryIngredients, newIngredient];
    syncToParent(updatedIngredients);
  }, [inventoryIngredients, syncToParent]);

  const updateIngredient = useCallback((index: number, updatedIngredient: InventoryIngredient) => {
    console.log(`🔄 Updating ingredient ${index}:`, updatedIngredient);
    const updated = [...inventoryIngredients];
    updated[index] = updatedIngredient;
    syncToParent(updated);
  }, [inventoryIngredients, syncToParent]);

  const removeIngredient = useCallback((index: number) => {
    const updated = inventoryIngredients.filter((_, i) => i !== index);
    syncToParent(updated);
  }, [inventoryIngredients, syncToParent]);

  return (
    <div className="space-y-6">
      {/* Header with Add Button and Cost Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Recipe Ingredients (Inventory-Based)</CardTitle>
              {ingredientStatus.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {ingredientStatus.status === 'partial' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              {ingredientStatus.status === 'empty' && <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {ingredientStatus.available}/{ingredientStatus.total} configured
              </Badge>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Estimated Cost</p>
                <p className="text-lg font-semibold">₱{totalCost.toFixed(2)}</p>
              </div>
              <Button onClick={addIngredient} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Inventory System Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Recipe ingredients must be selected from your store's inventory items. This ensures accurate costing and availability tracking.
        </AlertDescription>
      </Alert>

      {/* Ingredients List */}
      <div className="space-y-4">
        {inventoryIngredients.map((ingredient, index) => (
          <InventoryBasedIngredientForm
            key={index}
            ingredient={ingredient}
            index={index}
            storeId={storeId}
            onUpdate={updateIngredient}
            onRemove={removeIngredient}
          />
        ))}

        {inventoryIngredients.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-muted-foreground">No ingredients added yet</p>
                <p className="text-sm text-muted-foreground">
                  Click "Add Ingredient" to start building your recipe template
                </p>
                <Button onClick={addIngredient} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Ingredient
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cost Summary */}
      {inventoryIngredients.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ingredient Count:</span>
                <span>{inventoryIngredients.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Average Cost per Ingredient:</span>
                <span>₱{(totalCost / inventoryIngredients.length).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Recipe Cost:</span>
                  <span>₱{totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
