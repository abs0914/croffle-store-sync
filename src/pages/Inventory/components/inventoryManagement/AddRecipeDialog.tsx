
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { createRecipe, addRecipeIngredient } from '@/services/inventoryManagement/recipeService';
import { fetchInventoryStock } from '@/services/inventoryManagement/recipeService';
import { toast } from 'sonner';
import { InventoryStock } from '@/types/inventoryManagement';

interface AddRecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeId: string;
}

interface RecipeIngredientForm {
  inventory_stock_id: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
}

export function AddRecipeDialog({ isOpen, onClose, onSuccess, storeId }: AddRecipeDialogProps) {
  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState(1);
  const [ingredients, setIngredients] = useState<RecipeIngredientForm[]>([]);
  const [inventoryStock, setInventoryStock] = useState<InventoryStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInventoryStock();
    }
  }, [isOpen, storeId]);

  const loadInventoryStock = async () => {
    try {
      const data = await fetchInventoryStock(storeId);
      // Ensure cost property is defined for all items
      const stockWithCost = data.map(item => ({
        ...item,
        cost: item.cost ?? 0
      }));
      setInventoryStock(stockWithCost);
    } catch (error) {
      console.error('Error loading inventory stock:', error);
      toast.error('Failed to load inventory stock');
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, {
      inventory_stock_id: '',
      quantity: 1,
      unit: 'kg'
    }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredientForm, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipeName.trim()) {
      toast.error('Recipe name is required');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('At least one ingredient is required');
      return;
    }

    setIsLoading(true);

    try {
      const recipe = await createRecipe({
        name: recipeName,
        description,
        instructions,
        yield_quantity: yieldQuantity,
        store_id: storeId,
        product_id: '', // Will be set when recipe is deployed as product
        is_active: true,
        version: 1
      });

      if (recipe) {
        // Add ingredients
        for (const ingredient of ingredients) {
          await addRecipeIngredient({
            recipe_id: recipe.id,
            inventory_stock_id: ingredient.inventory_stock_id,
            quantity: ingredient.quantity,
            unit: ingredient.unit
          });
        }

        toast.success('Recipe created successfully');
        onSuccess();
        handleClose();
      }
    } catch (error) {
      console.error('Error creating recipe:', error);
      toast.error('Failed to create recipe');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRecipeName('');
    setDescription('');
    setInstructions('');
    setYieldQuantity(1);
    setIngredients([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Recipe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="Enter recipe name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="yield">Yield Quantity</Label>
              <Input
                id="yield"
                type="number"
                min="1"
                step="0.1"
                value={yieldQuantity}
                onChange={(e) => setYieldQuantity(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Recipe description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Preparation instructions"
              rows={5}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Ingredients</Label>
              <Button type="button" onClick={addIngredient} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>

            {ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 mb-2 items-end">
                <div>
                  <Label>Inventory Item</Label>
                  <Select
                    value={ingredient.inventory_stock_id}
                    onValueChange={(value) => updateIngredient(index, 'inventory_stock_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryStock.map((stock) => (
                        <SelectItem key={stock.id} value={stock.id}>
                          {stock.item} ({stock.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                  />
                </div>
                
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={ingredient.unit}
                    onValueChange={(value) => updateIngredient(index, 'unit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="pieces">pieces</SelectItem>
                      <SelectItem value="liters">liters</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="boxes">boxes</SelectItem>
                      <SelectItem value="packs">packs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {ingredients.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No ingredients added yet. Click "Add Ingredient" to get started.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
