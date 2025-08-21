import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, ChefHat, Calculator, Package } from 'lucide-react';
import { CategoryEnhancedIngredientForm } from './CategoryEnhancedIngredientForm';

interface RecipeIngredient {
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface SimplifiedRecipeFormProps {
  recipe?: {
    id?: string;
    name: string;
    ingredients?: RecipeIngredient[];
  } | null;
  storeId: string;
  onSave: (data: { name: string; ingredients: RecipeIngredient[] }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const SimplifiedRecipeForm: React.FC<SimplifiedRecipeFormProps> = ({
  recipe,
  storeId,
  onSave,
  onCancel,
  isSubmitting = false
}) => {
  const [recipeName, setRecipeName] = useState(recipe?.name || '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || []
  );

  const totalRecipeCost = ingredients.reduce(
    (sum, ingredient) => sum + (ingredient.quantity * ingredient.cost_per_unit), 0
  );

  const addIngredient = useCallback(() => {
    const newIngredient: RecipeIngredient = {
      inventory_stock_id: '',
      ingredient_name: '',
      quantity: 1,
      unit: '',
      cost_per_unit: 0
    };
    setIngredients(prev => [...prev, newIngredient]);
  }, []);

  const updateIngredient = useCallback((index: number, updatedIngredient: RecipeIngredient) => {
    setIngredients(prev => prev.map((ingredient, i) => 
      i === index ? updatedIngredient : ingredient
    ));
  }, []);

  const removeIngredient = useCallback((index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipeName.trim()) {
      return;
    }

    const validIngredients = ingredients.filter(
      ingredient => 
        ingredient.inventory_stock_id && 
        ingredient.ingredient_name && 
        ingredient.quantity > 0
    );

    onSave({
      name: recipeName.trim(),
      ingredients: validIngredients
    });
  };

  const canSubmit = recipeName.trim() && ingredients.some(
    ingredient => 
      ingredient.inventory_stock_id && 
      ingredient.ingredient_name && 
      ingredient.quantity > 0
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Recipe Name */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Recipe Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Recipe Name</Label>
            <Input
              id="recipe-name"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="Enter recipe name..."
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Ingredients Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ingredients
              {ingredients.length > 0 && (
                <Badge variant="secondary">{ingredients.length}</Badge>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Ingredient
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingredients.length === 0 ? (
            <Alert>
              <AlertDescription>
                No ingredients added yet. Click "Add Ingredient" to start building your recipe.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <CategoryEnhancedIngredientForm
                  key={index}
                  ingredient={ingredient}
                  index={index}
                  onUpdate={updateIngredient}
                  onRemove={removeIngredient}
                  storeId={storeId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary */}
      {ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cost Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Ingredients:</span>
                <span>{ingredients.length} items</span>
              </div>
              <div className="flex justify-between font-medium text-lg">
                <span>Total Recipe Cost:</span>
                <span>₱{totalRecipeCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Cost per Serving (1):</span>
                <span>₱{totalRecipeCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Saving...' : (recipe?.id ? 'Update Recipe' : 'Create Recipe')}
        </Button>
      </div>
    </form>
  );
};