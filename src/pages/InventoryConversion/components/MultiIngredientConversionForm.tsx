
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, AlertTriangle, ChefHat } from "lucide-react";
import { 
  CommissaryInventoryItem, 
  InventoryStock, 
  ConversionRecipe, 
  MultiIngredientConversionForm as ConversionFormData 
} from "@/types/inventoryManagement";
import { 
  fetchCommissaryItemsForConversion, 
  fetchStoreInventoryForConversion, 
  createOrFindStoreInventoryItem,
  createMultiIngredientConversion,
  fetchConversionRecipes
} from "@/services/inventoryManagement/inventoryConversionService";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface MultiIngredientConversionFormProps {
  storeId: string;
  onSuccess: () => void;
}

interface ConversionIngredient {
  commissary_item_id: string;
  quantity: number;
  unit_cost: number;
}

export function MultiIngredientConversionForm({ 
  storeId, 
  onSuccess 
}: MultiIngredientConversionFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [storeInventory, setStoreInventory] = useState<InventoryStock[]>([]);
  const [conversionRecipes, setConversionRecipes] = useState<ConversionRecipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<ConversionRecipe | null>(null);
  
  const [formData, setFormData] = useState({
    inventory_stock_id: '',
    finished_goods_quantity: 1,
    conversion_recipe_i
d: '',
    notes: '',
    finished_item_name: '',
    finished_item_unit: ''
  });
  
  const [ingredients, setIngredients] = useState<ConversionIngredient[]>([]);

  useEffect(() => {
    loadData();
  }, [storeId]);

  useEffect(() => {
    if (formData.conversion_recipe_id) {
      const recipe = conversionRecipes.find(r => r.id === formData.conversion_recipe_id);
      setSelectedRecipe(recipe || null);
      
      if (recipe) {
        // Pre-populate ingredients from recipe
        const recipeIngredients = recipe.ingredients?.map(ing => ({
          commissary_item_id: ing.commissary_item_id,
          quantity: ing.quantity,
          unit_cost: ing.commissary_item?.unit_cost || 0
        })) || [];
        
        setIngredients(recipeIngredients);
        setFormData(prev => ({
          ...prev,
          finished_item_name: recipe.finished_item_name,
          finished_item_unit: recipe.finished_item_unit
        }));
      }
    } else {
      setSelectedRecipe(null);
      setIngredients([]);
    }
  }, [formData.conversion_recipe_id, conversionRecipes]);

  const loadData = async () => {
    const [commissaryData, storeData, recipesData] = await Promise.all([
      fetchCommissaryItemsForConversion(),
      fetchStoreInventoryForConversion(storeId),
      fetchConversionRecipes()
    ]);
    
    setCommissaryItems(commissaryData);
    setStoreInventory(storeData);
    setConversionRecipes(recipesData);
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, { 
      commissary_item_id: '', 
      quantity: 1, 
      unit_cost: 0 
    }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof ConversionIngredient, value: string | number) => {
    setIngredients(prev => prev.map((ingredient, i) => {
      if (i === index) {
        const updated = { ...ingredient, [field]: value };
        
        // Auto-populate unit cost when commissary item is selected
        if (field === 'commissary_item_id') {
          const commissaryItem = commissaryItems.find(item => item.id === value);
          if (commissaryItem) {
            updated.unit_cost = commissaryItem.unit_cost || 0;
          }
        }
        
        return updated;
      }
      return ingredient;
    }));
  };

  const getCommissaryItemById = (id: string) => {
    return commissaryItems.find(item => item.id === id);
  };

  const handleCreateStoreItem = async () => {
    if (!formData.finished_item_name || !formData.finished_item_unit) {
      toast.error('Please specify finished item name and unit');
      return;
    }

    const newItem = await createOrFindStoreInventoryItem(
      storeId,
      formData.finished_item_name,
      formData.finished_item_unit
    );

    if (newItem) {
      setStoreInventory(prev => [...prev, newItem]);
      setFormData(prev => ({ ...prev, inventory_stock_id: newItem.id }));
      toast.success('Store inventory item created');
    }
  };

  const validateIngredients = () => {
    for (const ingredient of ingredients) {
      const commissaryItem = getCommissaryItemById(ingredient.commissary_item_id);
      if (!commissaryItem) continue;
      
      if (ingredient.quantity > commissaryItem.current_stock) {
        toast.error(`Insufficient stock for ${commissaryItem.name}. Available: ${commissaryItem.current_stock} ${commissaryItem.uom}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!validateIngredients()) return;

    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    const validIngredients = ingredients.filter(ing => 
      ing.commissary_item_id && ing.quantity > 0
    );

    if (validIngredients.length === 0) {
      toast.error('Please add valid ingredients');
      return;
    }

    setLoading(true);

    const conversionData: ConversionFormData = {
      inventory_stock_id: formData.inventory_stock_id,
      finished_goods_quantity: formData.finished_goods_quantity,
      conversion_recipe_id: formData.conversion_recipe_id || undefined,
      notes: formData.notes,
      ingredients: validIngredients
    };

    const success = await createMultiIngredientConversion(conversionData, storeId, user.id);
    
    setLoading(false);

    if (success) {
      onSuccess();
      // Reset form
      setFormData({
        inventory_stock_id: '',
        finished_goods_quantity: 1,
        conversion_recipe_id: '',
        notes: '',
        finished_item_name: '',
        finished_item_unit: ''
      });
      setIngredients([]);
    }
  };

  const getTotalCost = () => {
    return ingredients.reduce((total, ingredient) => {
      return total + (ingredient.quantity * ingredient.unit_cost);
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Multi-Ingredient Conversion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipe Selection */}
          <div className="space-y-2">
            <Label htmlFor="recipe">Use Conversion Recipe (Optional)</Label>
            <Select
              value={formData.conversion_recipe_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, conversion_recipe_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a recipe or create custom conversion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Custom Conversion</SelectItem>
                {conversionRecipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.name} → {recipe.yield_quantity} {recipe.finished_item_unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedRecipe && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Using recipe: <strong>{selectedRecipe.name}</strong>
                  <br />
                  Yields: {selectedRecipe.yield_quantity} {selectedRecipe.finished_item_unit}
                  <br />
                  {selectedRecipe.description && `Description: ${selectedRecipe.description}`}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Finished Item Details */}
          {!selectedRecipe && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="finished_item_name">Finished Item Name *</Label>
                <Input
                  id="finished_item_name"
                  value={formData.finished_item_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, finished_item_name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="finished_item_unit">Finished Item Unit *</Label>
                <Input
                  id="finished_item_unit"
                  value={formData.finished_item_unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, finished_item_unit: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          {/* Store Item Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="store_item">Store Inventory Item *</Label>
              <Button
                type="button"
                onClick={handleCreateStoreItem}
                size="sm"
                variant="outline"
                disabled={!formData.finished_item_name || !formData.finished_item_unit}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Item
              </Button>
            </div>
            <Select
              value={formData.inventory_stock_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, inventory_stock_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select store inventory item" />
              </SelectTrigger>
              <SelectContent>
                {storeInventory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item} ({item.stock_quantity} {item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Finished Goods Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Finished Goods Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.finished_goods_quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, finished_goods_quantity: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>

          {/* Ingredients Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">Ingredients</Label>
              {!selectedRecipe && (
                <Button type="button" onClick={addIngredient} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ingredient
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {ingredients.map((ingredient, index) => {
                const commissaryItem = getCommissaryItemById(ingredient.commissary_item_id);
                const hasInsufficientStock = commissaryItem && ingredient.quantity > commissaryItem.current_stock;
                
                return (
                  <div key={index} className={`flex items-center gap-3 p-3 border rounded-lg ${hasInsufficientStock ? 'border-red-300 bg-red-50' : ''}`}>
                    <div className="flex-1">
                      <Select
                        value={ingredient.commissary_item_id}
                        onValueChange={(value) => updateIngredient(index, 'commissary_item_id', value)}
                        disabled={!!selectedRecipe}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select commissary item" />
                        </SelectTrigger>
                        <SelectContent>
                          {commissaryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{item.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {item.current_stock} {item.uom}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Quantity"
                        className={hasInsufficientStock ? 'border-red-300' : ''}
                      />
                    </div>
                    
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={ingredient.unit_cost}
                        onChange={(e) => updateIngredient(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                        placeholder="Cost"
                      />
                    </div>
                    
                    {commissaryItem && (
                      <div className="w-16 text-sm text-muted-foreground">
                        {commissaryItem.uom}
                      </div>
                    )}
                    
                    {!selectedRecipe && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIngredient(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {hasInsufficientStock && (
                      <div className="text-red-600 text-xs">
                        Only {commissaryItem?.current_stock} {commissaryItem?.uom} available
                      </div>
                    )}
                  </div>
                );
              })}
              
              {ingredients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedRecipe ? 'Select a recipe to load ingredients' : 'No ingredients added yet. Click "Add Ingredient" to start.'}
                </div>
              )}
            </div>
          </div>

          {/* Cost Summary */}
          {ingredients.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Ingredient Cost:</span>
                <span className="text-lg font-bold">₱{getTotalCost().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Cost per unit:</span>
                <span>₱{(getTotalCost() / formData.finished_goods_quantity).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={loading || ingredients.length === 0 || !formData.inventory_stock_id}
            className="w-full"
          >
            {loading ? 'Converting...' : 'Create Conversion'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
