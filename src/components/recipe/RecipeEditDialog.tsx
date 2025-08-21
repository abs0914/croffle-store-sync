import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IngredientFormAdapter } from './IngredientFormAdapter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ChefHat, Calculator, Save, X, Plus } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  yield_quantity: number;
  total_cost: number;
  cost_per_serving: number;
  store_id: string;
  template_id?: string;
  is_active: boolean;
}

interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  inventory_stock_id?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface RecipeEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  storeId: string;
}

export const RecipeEditDialog: React.FC<RecipeEditDialogProps> = ({
  isOpen,
  onClose,
  recipe,
  storeId
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    yield_quantity: 1,
    is_active: true
  });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (recipe && isOpen) {
      setFormData({
        name: recipe.name,
        description: recipe.description || '',
        instructions: recipe.instructions || '',
        yield_quantity: recipe.yield_quantity,
        is_active: recipe.is_active
      });
      loadRecipeIngredients();
    } else if (isOpen) {
      // Reset for new recipe
      setFormData({
        name: '',
        description: '',
        instructions: '',
        yield_quantity: 1,
        is_active: true
      });
      setIngredients([]);
    }
  }, [recipe, isOpen]);

  useEffect(() => {
    // Calculate total cost whenever ingredients change
    const total = ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
    setTotalCost(total);
  }, [ingredients]);

  const loadRecipeIngredients = async () => {
    if (!recipe) return;

    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id);

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      toast.error('Failed to load recipe ingredients');
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    setLoading(true);
    try {
      if (recipe) {
        // Update existing recipe
        const { error: recipeError } = await supabase
          .from('recipes')
          .update({
            name: formData.name,
            description: formData.description,
            instructions: formData.instructions,
            yield_quantity: formData.yield_quantity,
            total_cost: totalCost,
            cost_per_serving: totalCost / formData.yield_quantity,
            is_active: formData.is_active
          })
          .eq('id', recipe.id);

        if (recipeError) throw recipeError;

        // Delete existing ingredients
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipe.id);

        // Insert updated ingredients
        if (ingredients.length > 0) {
          const ingredientsData = ingredients.map(ing => ({
            recipe_id: recipe.id,
            inventory_stock_id: ing.inventory_stock_id || null,
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit as any, // Cast to handle enum type
            cost_per_unit: ing.cost_per_unit
          }));

          const { error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientsData);

          if (ingredientsError) throw ingredientsError;
        }

        toast.success('Recipe updated successfully');
      } else {
        // Create new recipe
        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            name: formData.name,
            description: formData.description,
            instructions: formData.instructions,
            yield_quantity: formData.yield_quantity,
            total_cost: totalCost,
            cost_per_serving: totalCost / formData.yield_quantity,
            store_id: storeId,
            is_active: formData.is_active
          })
          .select()
          .single();

        if (recipeError) throw recipeError;

        // Insert ingredients
        if (ingredients.length > 0) {
          const ingredientsData = ingredients.map(ing => ({
            recipe_id: newRecipe.id,
            inventory_stock_id: ing.inventory_stock_id || null,
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit as any, // Cast to handle enum type
            cost_per_unit: ing.cost_per_unit
          }));

          const { error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientsData);

          if (ingredientsError) throw ingredientsError;
        }

        toast.success('Recipe created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        inventory_stock_id: '',
        ingredient_name: '',
        quantity: 0,
        unit: 'pieces', // Default to a valid enum value
        cost_per_unit: 0
      }
    ]);
  };

  const updateIngredient = (index: number, updatedIngredient: RecipeIngredient) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = updatedIngredient;
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const costPerServing = formData.yield_quantity > 0 ? totalCost / formData.yield_quantity : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            {recipe ? 'Edit Recipe' : 'Create New Recipe'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="costing">Cost Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recipe Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Recipe Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter recipe name..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the recipe..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Preparation Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Step by step instructions..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="yield">Yield Quantity (Servings)</Label>
                  <Input
                    id="yield"
                    type="number"
                    min="1"
                    value={formData.yield_quantity}
                    onChange={(e) => setFormData({ ...formData, yield_quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ingredients" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recipe Ingredients</CardTitle>
                <Button onClick={addIngredient} size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Ingredient
                </Button>
              </CardHeader>
              <CardContent>
                {ingredients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No ingredients added yet. Click "Add Ingredient" to start.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ingredients.map((ingredient, index) => (
                      <IngredientFormAdapter
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
          </TabsContent>

          <TabsContent value="costing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Cost Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">₱{totalCost.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Recipe Cost</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">₱{costPerServing.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Cost per Serving</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Ingredient Breakdown</h4>
                  {ingredients.map((ingredient, index) => {
                    const ingredientTotal = ingredient.quantity * ingredient.cost_per_unit;
                    const percentage = totalCost > 0 ? (ingredientTotal / totalCost) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div className="flex-1">
                          <div className="font-medium">{ingredient.ingredient_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {ingredient.quantity} {ingredient.unit} × ₱{ingredient.cost_per_unit.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₱{ingredientTotal.toFixed(2)}</div>
                          <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Recipe'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};