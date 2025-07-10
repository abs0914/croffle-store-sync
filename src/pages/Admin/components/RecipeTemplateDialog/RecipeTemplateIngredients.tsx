
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, AlertTriangle } from 'lucide-react';
import { DirectInventoryIngredientForm } from '@/components/recipe/DirectInventoryIngredientForm';
import { useDirectInventoryRecipe } from '@/hooks/recipe/useDirectInventoryRecipe';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/types';
import { DirectInventoryIngredient, calculateDirectRecipeCost } from '@/services/recipeManagement/directInventoryService';

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
  const [directIngredients, setDirectIngredients] = useState<DirectInventoryIngredient[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  // Convert between legacy and direct inventory formats
  useEffect(() => {
    const converted = ingredients.map(ing => ({
      ingredient_name: ing.ingredient_name || '',
      quantity: ing.quantity || 1,
      unit: ing.unit || 'pieces',
      inventory_stock_id: ing.inventory_stock_id,
      estimated_cost_per_unit: ing.cost_per_unit || 0,
      location_type: ing.location_type || 'all' as const,
      supports_fractional: ing.supports_fractional || false
    }));
    setDirectIngredients(converted);
  }, [ingredients]);

  // Update cost when ingredients change
  useEffect(() => {
    const cost = calculateDirectRecipeCost(directIngredients);
    setTotalCost(cost);
  }, [directIngredients]);

  // Sync back to parent component
  useEffect(() => {
    const converted = directIngredients.map(ing => ({
      ingredient_name: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.estimated_cost_per_unit || 0,
      inventory_stock_id: ing.inventory_stock_id,
      commissary_item_id: null,
      location_type: ing.location_type,
      supports_fractional: ing.supports_fractional,
      notes: ''
    }));
    setIngredients(converted);
  }, [directIngredients, setIngredients]);

  const addIngredient = () => {
    const newIngredient: DirectInventoryIngredient = {
      ingredient_name: '',
      quantity: 1,
      unit: 'pieces',
      location_type: 'all',
      supports_fractional: false
    };
    setDirectIngredients(prev => [...prev, newIngredient]);
  };

  const updateIngredient = (index: number, field: keyof DirectInventoryIngredient, value: any) => {
    setDirectIngredients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeIngredient = (index: number) => {
    setDirectIngredients(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button and Cost Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recipe Template Ingredients</CardTitle>
            <div className="flex items-center gap-4">
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

      {/* Direct Inventory System Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This recipe template uses the direct inventory system. Ingredients are mapped 1:1 to serving-ready inventory items. 
          Mini Croffle ingredients support fractional quantities (0.5, 1.5, etc.) for precise portion control.
        </AlertDescription>
      </Alert>

      {/* Ingredients List */}
      <div className="space-y-4">
        {directIngredients.map((ingredient, index) => (
          <DirectInventoryIngredientForm
            key={index}
            ingredient={ingredient}
            index={index}
            storeId={storeId}
            onUpdate={updateIngredient}
            onRemove={removeIngredient}
          />
        ))}

        {directIngredients.length === 0 && (
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
      {directIngredients.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ingredient Count:</span>
                <span>{directIngredients.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Average Cost per Ingredient:</span>
                <span>₱{(totalCost / directIngredients.length).toFixed(2)}</span>
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
