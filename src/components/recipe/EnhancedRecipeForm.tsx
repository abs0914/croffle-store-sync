import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Calculator, Clock, Users, ChefHat, Package } from "lucide-react";
import { Recipe, InventoryStock } from "@/types/inventoryManagement";
import { calculateRecipeCost } from "@/services/inventoryManagement/recipeService";

interface EnhancedRecipeFormProps {
  recipe?: Recipe;
  storeId: string;
  onSubmit: (recipeData: any) => Promise<void>;
  onCancel: () => void;
  inventoryItems: InventoryStock[];
}

interface RecipeFormData {
  name: string;
  description: string;
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty_level: 'easy' | 'medium' | 'hard';
  instructions: string;
  notes: string;
  category: string;
  tags: string[];
}

interface IngredientFormData {
  inventory_stock_id: string;
  quantity: number;
  unit: string;
  notes?: string;
  isNew?: boolean;
}

export function EnhancedRecipeForm({ 
  recipe, 
  storeId, 
  onSubmit, 
  onCancel, 
  inventoryItems 
}: EnhancedRecipeFormProps) {
  const [formData, setFormData] = useState<RecipeFormData>({
    name: recipe?.name || '',
    description: recipe?.description || '',
    yield_quantity: recipe?.yield_quantity || 1,
    yield_unit: 'pieces',
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    difficulty_level: 'medium',
    instructions: recipe?.instructions || '',
    notes: '',
    category: '',
    tags: []
  });

  const [ingredients, setIngredients] = useState<IngredientFormData[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recipe?.ingredients) {
      setIngredients(recipe.ingredients.map(ing => ({
        inventory_stock_id: ing.inventory_stock_id,
        quantity: ing.quantity,
        unit: ing.unit,
        notes: '',
        isNew: false
      })));
    } else {
      setIngredients([{ inventory_stock_id: '', quantity: 0, unit: 'kg', isNew: true }]);
    }
  }, [recipe]);

  const addIngredient = () => {
    setIngredients([...ingredients, { 
      inventory_stock_id: '', 
      quantity: 0, 
      unit: 'kg', 
      isNew: true 
    }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientFormData, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const calculateEstimatedCost = () => {
    return ingredients.reduce((total, ingredient) => {
      const item = inventoryItems.find(inv => inv.id === ingredient.inventory_stock_id);
      const cost = item?.cost || 0;
      return total + (cost * ingredient.quantity);
    }, 0);
  };

  const calculateCostPerUnit = () => {
    const totalCost = calculateEstimatedCost();
    return formData.yield_quantity > 0 ? totalCost / formData.yield_quantity : 0;
  };

  const getTotalTime = () => {
    return formData.prep_time_minutes + formData.cook_time_minutes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    const validIngredients = ingredients.filter(ing => 
      ing.inventory_stock_id && ing.quantity > 0
    );

    if (validIngredients.length === 0) {
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        ingredients: validIngredients,
        estimated_cost: calculateEstimatedCost(),
        cost_per_unit: calculateCostPerUnit(),
        total_time_minutes: getTotalTime()
      });
    } catch (error) {
      console.error('Error submitting recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Recipe Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter recipe name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appetizer">Appetizer</SelectItem>
                  <SelectItem value="main_course">Main Course</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="side_dish">Side Dish</SelectItem>
                  <SelectItem value="sauce">Sauce</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the recipe"
              rows={2}
            />
          </div>

          {/* Yield and Timing */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yield_quantity">Yield Quantity *</Label>
              <Input
                id="yield_quantity"
                type="number"
                min="1"
                value={formData.yield_quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, yield_quantity: parseInt(e.target.value) || 1 }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yield_unit">Yield Unit</Label>
              <Select
                value={formData.yield_unit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, yield_unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pieces">Pieces</SelectItem>
                  <SelectItem value="servings">Servings</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="batches">Batches</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prep_time">Prep Time (min)</Label>
              <Input
                id="prep_time"
                type="number"
                min="0"
                value={formData.prep_time_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, prep_time_minutes: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cook_time">Cook Time (min)</Label>
              <Input
                id="cook_time"
                type="number"
                min="0"
                value={formData.cook_time_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, cook_time_minutes: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select
              value={formData.difficulty_level}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">₱{calculateEstimatedCost().toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total Cost</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">₱{calculateCostPerUnit().toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Cost per {formData.yield_unit}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{getTotalTime()}</p>
              <p className="text-sm text-muted-foreground">Total Minutes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{ingredients.filter(i => i.inventory_stock_id).length}</p>
              <p className="text-sm text-muted-foreground">Ingredients</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ingredients
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
              <div className="md:col-span-2">
                <Label>Ingredient</Label>
                <Select
                  value={ingredient.inventory_stock_id}
                  onValueChange={(value) => updateIngredient(index, 'inventory_stock_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ingredient" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item} (Stock: {item.current_stock} {item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
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
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="g">Grams</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="ml">Milliliters</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="cups">Cups</SelectItem>
                    <SelectItem value="tbsp">Tablespoons</SelectItem>
                    <SelectItem value="tsp">Teaspoons</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Instructions and Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions">Cooking Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Step-by-step cooking instructions..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Tips, variations, storage instructions..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
        </Button>
      </div>
    </form>
  );
}
