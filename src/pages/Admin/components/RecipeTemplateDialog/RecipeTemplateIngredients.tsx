
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/recipeTemplateService';

interface CommissaryItem {
  id: string;
  name: string;
  unit: string;
  unit_cost?: number;
}

interface RecipeTemplateIngredientsProps {
  ingredients: RecipeTemplateIngredientInput[];
  setIngredients: React.Dispatch<React.SetStateAction<RecipeTemplateIngredientInput[]>>;
  commissaryItems: CommissaryItem[];
}

export const RecipeTemplateIngredients: React.FC<RecipeTemplateIngredientsProps> = ({
  ingredients,
  setIngredients,
  commissaryItems
}) => {
  const addIngredient = () => {
    setIngredients(prev => [...prev, {
      commissary_item_id: '',
      commissary_item_name: '',
      quantity: 1,
      unit: 'g',
      cost_per_unit: 0
    }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeTemplateIngredientInput, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'commissary_item_name' && value) {
      const item = commissaryItems.find(ci => ci.name === value);
      if (item) {
        updated[index].commissary_item_id = item.id;
        updated[index].unit = item.unit;
        updated[index].cost_per_unit = item.unit_cost || 0;
      }
    }
    
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
          <div key={index} className="grid grid-cols-5 gap-2 items-end">
            <div>
              <Label>Commissary item</Label>
              <Select
                value={ingredient.commissary_item_name}
                onValueChange={(value) => updateIngredient(index, 'commissary_item_name', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {commissaryItems.map(item => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name}
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
                  <SelectItem value="pieces">pieces</SelectItem>
                  <SelectItem value="liters">liters</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="boxes">boxes</SelectItem>
                  <SelectItem value="packs">packs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Cost per Unit</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={ingredient.cost_per_unit || 0}
                onChange={(e) => updateIngredient(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
              />
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
