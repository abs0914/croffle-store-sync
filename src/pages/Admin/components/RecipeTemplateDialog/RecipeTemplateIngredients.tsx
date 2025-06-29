
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { RecipeTemplateIngredientInput, INGREDIENT_CATEGORIES, INGREDIENT_TYPES } from '@/services/recipeManagement/types';

interface RecipeTemplateIngredientsProps {
  ingredients: RecipeTemplateIngredientInput[];
  setIngredients: React.Dispatch<React.SetStateAction<RecipeTemplateIngredientInput[]>>;
}

export const RecipeTemplateIngredients: React.FC<RecipeTemplateIngredientsProps> = ({
  ingredients,
  setIngredients
}) => {
  const addIngredient = () => {
    setIngredients(prev => [...prev, {
      ingredient_name: '',
      ingredient_category: 'ingredient',
      ingredient_type: 'raw_material',
      quantity: 1,
      unit: 'g'
    }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeTemplateIngredientInput, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Ingredients</CardTitle>
        <Button type="button" onClick={addIngredient} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {ingredients.map((ingredient, index) => (
          <div key={index} className="grid grid-cols-6 gap-2 items-end">
            <div>
              <Label>Ingredient Name</Label>
              <Input
                value={ingredient.ingredient_name}
                onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                placeholder="e.g., All Purpose Flour"
              />
            </div>
            
            <div>
              <Label>Category</Label>
              <Select
                value={ingredient.ingredient_category}
                onValueChange={(value) => updateIngredient(index, 'ingredient_category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select
                value={ingredient.ingredient_type}
                onValueChange={(value) => updateIngredient(index, 'ingredient_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
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
                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                  <SelectItem value="piece">piece</SelectItem>
                  <SelectItem value="pieces">pieces</SelectItem>
                  <SelectItem value="serving">serving</SelectItem>
                  <SelectItem value="portion">portion</SelectItem>
                  <SelectItem value="pair">pair</SelectItem>
                  <SelectItem value="scoop">scoop</SelectItem>
                  <SelectItem value="liters">liters</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="cups">cups</SelectItem>
                  <SelectItem value="tbsp">tbsp</SelectItem>
                  <SelectItem value="tsp">tsp</SelectItem>
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
      </CardContent>
    </Card>
  );
};
