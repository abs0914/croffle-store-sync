
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { updateRecipe, addRecipeIngredient, removeRecipeIngredient } from "@/services/inventoryManagement/recipeService";
import { fetchInventoryItems } from "@/services/inventoryManagement/inventoryItemService";
import { Recipe, InventoryItem, RecipeIngredient } from "@/types/inventoryManagement";

interface EditRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  storeId: string;
  onSuccess: () => void;
}

interface RecipeIngredientForm extends Partial<RecipeIngredient> {
  inventory_item_id: string;
  quantity: number;
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs';
  isNew?: boolean;
}

export function EditRecipeDialog({
  open,
  onOpenChange,
  recipe,
  storeId,
  onSuccess
}: EditRecipeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [formData, setFormData] = useState({
    name: recipe.name,
    description: recipe.description || '',
    instructions: recipe.instructions || '',
    yield_quantity: recipe.yield_quantity
  });
  const [ingredients, setIngredients] = useState<RecipeIngredientForm[]>([]);

  useEffect(() => {
    if (open) {
      loadInventoryItems();
      setFormData({
        name: recipe.name,
        description: recipe.description || '',
        instructions: recipe.instructions || '',
        yield_quantity: recipe.yield_quantity
      });
      setIngredients(recipe.ingredients?.map(ing => ({
        ...ing,
        inventory_item_id: ing.inventory_item_id,
        isNew: false
      })) || []);
    }
  }, [open, recipe]);

  const loadInventoryItems = async () => {
    const items = await fetchInventoryItems(storeId);
    setInventoryItems(items);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, {
      inventory_item_id: '',
      quantity: 0,
      unit: 'kg',
      isNew: true
    }]);
  };

  const removeIngredient = async (index: number) => {
    const ingredient = ingredients[index];
    
    if (!ingredient.isNew && ingredient.id) {
      // Remove from database
      await removeRecipeIngredient(ingredient.id);
    }
    
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredientForm, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update the recipe
      const updatedRecipe = await updateRecipe(recipe.id, formData);

      if (updatedRecipe) {
        // Add new ingredients
        for (const ingredient of ingredients) {
          if (ingredient.isNew && ingredient.inventory_item_id && ingredient.quantity > 0) {
            await addRecipeIngredient({
              recipe_id: recipe.id,
              inventory_item_id: ingredient.inventory_item_id,
              quantity: ingredient.quantity,
              unit: ingredient.unit
            });
          }
        }

        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recipe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yield_quantity">Yield Quantity *</Label>
              <Input
                id="yield_quantity"
                type="number"
                min="1"
                step="0.1"
                value={formData.yield_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, yield_quantity: parseFloat(e.target.value) || 1 }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                <Plus className="h-4 w-4 mr-2" />
                Add Ingredient
              </Button>
            </div>
            
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-end">
                  <div className="col-span-2">
                    <Select
                      value={ingredient.inventory_item_id}
                      onValueChange={(value) => updateIngredient(index, 'inventory_item_id', value)}
                      disabled={!ingredient.isNew}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Quantity"
                    value={ingredient.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                  
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
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Recipe'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
