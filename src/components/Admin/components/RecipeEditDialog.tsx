
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RecipeEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: any;
  onSuccess: () => void;
}

interface RecipeIngredient {
  id?: string;
  inventory_stock_id: string | null;
  quantity: number;
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
  cost_per_unit: number;
  inventory_stock?: {
    item: string;
    unit: string;
    cost: number;
  };
}

const VALID_UNITS = ['kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs'] as const;

export function RecipeEditDialog({ isOpen, onClose, recipe, onSuccess }: RecipeEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    yield_quantity: 1,
    serving_size: 1,
    is_active: true
  });
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && recipe) {
      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        instructions: recipe.instructions || '',
        yield_quantity: recipe.yield_quantity || 1,
        serving_size: recipe.serving_size || 1,
        is_active: recipe.is_active ?? true
      });

      // Load existing ingredients
      loadRecipeIngredients();
      // Load available inventory stock for the store
      loadInventoryStock();
    }
  }, [isOpen, recipe]);

  const loadRecipeIngredients = async () => {
    if (!recipe?.id) return;

    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          inventory_stock:inventory_stock(item, unit, cost)
        `)
        .eq('recipe_id', recipe.id);

      if (error) throw error;

      const mappedIngredients = data?.map(ing => ({
        id: ing.id,
        inventory_stock_id: ing.inventory_stock_id,
        quantity: ing.quantity || 0,
        unit: (VALID_UNITS.includes(ing.unit as any) ? ing.unit : 'g') as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs',
        cost_per_unit: ing.cost_per_unit || 0,
        inventory_stock: ing.inventory_stock
      })) || [];

      setIngredients(mappedIngredients.length > 0 ? mappedIngredients : [createEmptyIngredient()]);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      setIngredients([createEmptyIngredient()]);
    }
  };

  const loadInventoryStock = async () => {
    if (!recipe?.store_id) return;

    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', recipe.store_id)
        .eq('is_active', true)
        .order('item');

      if (error) throw error;
      setInventoryStock(data || []);
    } catch (error) {
      console.error('Error loading inventory stock:', error);
      setInventoryStock([]);
    }
  };

  const createEmptyIngredient = (): RecipeIngredient => ({
    inventory_stock_id: null,
    quantity: 0,
    unit: 'g',
    cost_per_unit: 0
  });

  const handleAddIngredient = () => {
    setIngredients([...ingredients, createEmptyIngredient()]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };

    // If inventory stock is selected, update cost and unit
    if (field === 'inventory_stock_id' && value) {
      const selectedStock = inventoryStock.find(stock => stock.id === value);
      if (selectedStock) {
        updated[index].cost_per_unit = selectedStock.cost || 0;
        // Ensure the unit is valid
        const stockUnit = selectedStock.unit;
        updated[index].unit = (VALID_UNITS.includes(stockUnit as any) ? stockUnit : 'g') as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
      }
    }

    setIngredients(updated);
  };

  const handleSave = async () => {
    if (!recipe?.id) return;

    setIsSaving(true);
    try {
      // Update recipe basic info
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name: formData.name,
          description: formData.description,
          instructions: formData.instructions,
          yield_quantity: formData.yield_quantity,
          serving_size: formData.serving_size,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipe.id);

      if (recipeError) throw recipeError;

      // Delete existing ingredients
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipe.id);

      if (deleteError) throw deleteError;

      // Insert updated ingredients
      const validIngredients = ingredients.filter(ing => 
        ing.inventory_stock_id && ing.quantity > 0
      );

      if (validIngredients.length > 0) {
        const ingredientsToInsert = validIngredients.map(ing => ({
          recipe_id: recipe.id,
          inventory_stock_id: ing.inventory_stock_id!,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) throw ingredientsError;
      }

      // Calculate and update recipe costs
      const totalCost = validIngredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
      const costPerServing = formData.serving_size > 0 ? totalCost / formData.serving_size : totalCost;

      await supabase
        .from('recipes')
        .update({
          total_cost: totalCost,
          cost_per_serving: costPerServing
        })
        .eq('id', recipe.id);

      toast.success('Recipe updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe: {recipe?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Recipe Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value === 'active' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yield_quantity">Yield Quantity</Label>
                  <Input
                    id="yield_quantity"
                    type="number"
                    min="1"
                    value={formData.yield_quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, yield_quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="serving_size">Serving Size</Label>
                  <Input
                    id="serving_size"
                    type="number"
                    min="1"
                    value={formData.serving_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, serving_size: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ingredients</CardTitle>
                <Button onClick={handleAddIngredient} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label>Inventory Item</Label>
                      <Select
                        value={ingredient.inventory_stock_id || ''}
                        onValueChange={(value) => handleIngredientChange(index, 'inventory_stock_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryStock.map(stock => (
                            <SelectItem key={stock.id} value={stock.id}>
                              {stock.item} ({stock.unit}) - ₱{stock.cost}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ingredient.quantity}
                        onChange={(e) => handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Unit</Label>
                      <Select
                        value={ingredient.unit}
                        onValueChange={(value) => handleIngredientChange(index, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_UNITS.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label>Cost/Unit</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ingredient.cost_per_unit}
                        onChange={(e) => handleIngredientChange(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-1">
                      <Label>Total</Label>
                      <div className="text-sm font-medium py-2">
                        ₱{(ingredient.quantity * ingredient.cost_per_unit).toFixed(2)}
                      </div>
                    </div>

                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveIngredient(index)}
                        disabled={ingredients.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Enter cooking instructions..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
