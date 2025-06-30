
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Calculator, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipeIngredient {
  id?: string;
  ingredient_name: string;
  recipe_unit: string;
  quantity: number;
  cost_per_recipe_unit: number;
  purchase_unit?: string;
  conversion_factor?: number;
  bulk_inventory_item?: string;
  notes?: string;
}

interface BulkInventoryMapping {
  recipe_ingredient_name: string;
  bulk_item_name: string;
  conversion_factor: number;
  recipe_unit: string;
  bulk_unit: string;
}

interface EnhancedIngredientBreakdownProps {
  recipeId?: string;
  templateId?: string;
  onSave?: (ingredients: RecipeIngredient[], mappings: BulkInventoryMapping[]) => void;
  readOnly?: boolean;
}

export function EnhancedIngredientBreakdown({
  recipeId,
  templateId,
  onSave,
  readOnly = false
}: EnhancedIngredientBreakdownProps) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [bulkMappings, setBulkMappings] = useState<BulkInventoryMapping[]>([]);
  const [commissaryItems, setCommissaryItems] = useState<any[]>([]);
  const [unitConversions, setUnitConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [recipeId, templateId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load commissary items for bulk inventory mapping
      const { data: commissaryData } = await supabase
        .from('commissary_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setCommissaryItems(commissaryData || []);

      // Load unit conversions
      const { data: conversionsData } = await supabase
        .from('ingredient_unit_conversions')
        .select('*')
        .order('ingredient_name');

      setUnitConversions(conversionsData || []);

      // Load existing ingredients if editing
      if (recipeId) {
        const { data: ingredientsData } = await supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', recipeId);

        if (ingredientsData) {
          const mappedIngredients = ingredientsData.map(ing => ({
            id: ing.id,
            ingredient_name: ing.ingredient_name || 'Unknown',
            recipe_unit: ing.recipe_unit || ing.unit,
            quantity: ing.quantity,
            cost_per_recipe_unit: ing.cost_per_recipe_unit || ing.cost_per_unit || 0,
            purchase_unit: ing.purchase_unit,
            conversion_factor: ing.conversion_factor || 1,
            bulk_inventory_item: ing.commissary_item_id
          }));
          setIngredients(mappedIngredients);
        }
      } else if (templateId) {
        const { data: templateIngredientsData } = await supabase
          .from('recipe_template_ingredients')
          .select('*')
          .eq('recipe_template_id', templateId);

        if (templateIngredientsData) {
          const mappedIngredients = templateIngredientsData.map(ing => ({
            ingredient_name: ing.ingredient_name,
            recipe_unit: ing.recipe_unit || ing.unit,
            quantity: ing.quantity,
            cost_per_recipe_unit: ing.cost_per_recipe_unit || ing.cost_per_unit || 0,
            purchase_unit: ing.purchase_unit,
            conversion_factor: ing.conversion_factor || 1,
            bulk_inventory_item: ing.commissary_item_id
          }));
          setIngredients(mappedIngredients);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load ingredient data');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients(prev => [...prev, {
      ingredient_name: '',
      recipe_unit: 'piece',
      quantity: 1,
      cost_per_recipe_unit: 0,
      conversion_factor: 1
    }]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setIngredients(prev => prev.map((ingredient, i) => {
      if (i === index) {
        const updated = { ...ingredient, [field]: value };
        
        // Auto-calculate conversion if both units are provided
        if (field === 'ingredient_name' || field === 'recipe_unit' || field === 'purchase_unit') {
          const conversion = unitConversions.find(c => 
            c.ingredient_name.toLowerCase() === updated.ingredient_name.toLowerCase() &&
            c.from_unit === updated.purchase_unit &&
            c.to_unit === updated.recipe_unit
          );
          
          if (conversion) {
            updated.conversion_factor = conversion.conversion_factor;
          }
        }
        
        return updated;
      }
      return ingredient;
    }));
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addBulkMapping = () => {
    setBulkMappings(prev => [...prev, {
      recipe_ingredient_name: '',
      bulk_item_name: '',
      conversion_factor: 1,
      recipe_unit: 'piece',
      bulk_unit: 'box'
    }]);
  };

  const updateBulkMapping = (index: number, field: keyof BulkInventoryMapping, value: any) => {
    setBulkMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  const removeBulkMapping = (index: number) => {
    setBulkMappings(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    return ingredients.reduce((total, ingredient) => 
      total + (ingredient.quantity * ingredient.cost_per_recipe_unit), 0
    );
  };

  const handleSave = async () => {
    if (onSave) {
      onSave(ingredients, bulkMappings);
    } else {
      toast.success('Ingredient breakdown updated');
    }
  };

  const getConversionSuggestion = (ingredientName: string, recipeUnit: string) => {
    return unitConversions.find(c => 
      c.ingredient_name.toLowerCase().includes(ingredientName.toLowerCase()) &&
      c.to_unit === recipeUnit
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Enhanced Recipe Ingredient Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ingredients" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ingredients">Recipe Ingredients</TabsTrigger>
              <TabsTrigger value="mappings">Bulk Inventory Mapping</TabsTrigger>
              <TabsTrigger value="summary">Cost Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="ingredients" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Recipe-Level Ingredients</h3>
                {!readOnly && (
                  <Button onClick={addIngredient} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ingredient
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {ingredients.map((ingredient, index) => {
                  const conversionSuggestion = getConversionSuggestion(
                    ingredient.ingredient_name, 
                    ingredient.recipe_unit
                  );

                  return (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                      <div className="col-span-3">
                        <Label>Ingredient Name</Label>
                        <Input
                          value={ingredient.ingredient_name}
                          onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                          placeholder="e.g., Croissant"
                          disabled={readOnly}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label>Recipe Unit</Label>
                        <Select
                          value={ingredient.recipe_unit}
                          onValueChange={(value) => updateIngredient(index, 'recipe_unit', value)}
                          disabled={readOnly}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="piece">piece</SelectItem>
                            <SelectItem value="serving">serving</SelectItem>
                            <SelectItem value="portion">portion</SelectItem>
                            <SelectItem value="pair">pair</SelectItem>
                            <SelectItem value="scoop">scoop</SelectItem>
                            <SelectItem value="cup">cup</SelectItem>
                            <SelectItem value="tbsp">tbsp</SelectItem>
                            <SelectItem value="tsp">tsp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-1">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.quantity}
                          onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                          disabled={readOnly}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label>Cost per Unit (₱)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={ingredient.cost_per_recipe_unit}
                          onChange={(e) => updateIngredient(index, 'cost_per_recipe_unit', parseFloat(e.target.value) || 0)}
                          disabled={readOnly}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <Label>Purchase Unit</Label>
                        <Select
                          value={ingredient.purchase_unit || ''}
                          onValueChange={(value) => updateIngredient(index, 'purchase_unit', value)}
                          disabled={readOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="box">box</SelectItem>
                            <SelectItem value="package">package</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="liters">liters</SelectItem>
                            <SelectItem value="pieces">pieces</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="col-span-1">
                        <Label>Conversion</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.conversion_factor || 1}
                          onChange={(e) => updateIngredient(index, 'conversion_factor', parseFloat(e.target.value) || 1)}
                          disabled={readOnly}
                        />
                      </div>
                      
                      <div className="col-span-1">
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeIngredient(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {conversionSuggestion && (
                        <div className="col-span-12">
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Suggested conversion: 1 {conversionSuggestion.from_unit} = {conversionSuggestion.conversion_factor} {conversionSuggestion.to_unit}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="mappings" className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Bulk Inventory Mapping</h3>
                  <p className="text-sm text-muted-foreground">
                    Map recipe ingredients to bulk commissary items for inventory deduction
                  </p>
                </div>
                {!readOnly && (
                  <Button onClick={addBulkMapping} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mapping
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {bulkMappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-6 gap-2 items-end p-3 border rounded-lg">
                    <div>
                      <Label>Recipe Ingredient</Label>
                      <Select
                        value={mapping.recipe_ingredient_name}
                        onValueChange={(value) => updateBulkMapping(index, 'recipe_ingredient_name', value)}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredients.map((ing, i) => (
                            <SelectItem key={i} value={ing.ingredient_name}>
                              {ing.ingredient_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Bulk Item</Label>
                      <Select
                        value={mapping.bulk_item_name}
                        onValueChange={(value) => updateBulkMapping(index, 'bulk_item_name', value)}
                        disabled={readOnly}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bulk item" />
                        </SelectTrigger>
                        <SelectContent>
                          {commissaryItems.map((item) => (
                            <SelectItem key={item.id} value={item.name}>
                              {item.name} ({item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Recipe Unit</Label>
                      <Input
                        value={mapping.recipe_unit}
                        onChange={(e) => updateBulkMapping(index, 'recipe_unit', e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                    
                    <div>
                      <Label>Bulk Unit</Label>
                      <Input
                        value={mapping.bulk_unit}
                        onChange={(e) => updateBulkMapping(index, 'bulk_unit', e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                    
                    <div>
                      <Label>Conversion Factor</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={mapping.conversion_factor}
                        onChange={(e) => updateBulkMapping(index, 'conversion_factor', parseFloat(e.target.value) || 1)}
                        disabled={readOnly}
                      />
                    </div>
                    
                    <div>
                      {!readOnly && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeBulkMapping(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recipe Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ingredients.map((ingredient, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{ingredient.ingredient_name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({ingredient.quantity} {ingredient.recipe_unit} × ₱{ingredient.cost_per_recipe_unit})
                          </span>
                        </div>
                        <Badge variant="outline">
                          ₱{(ingredient.quantity * ingredient.cost_per_recipe_unit).toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                    <div className="border-t pt-3 flex justify-between items-center font-bold">
                      <span>Total Recipe Cost</span>
                      <Badge>₱{calculateTotalCost().toFixed(2)}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Inventory Deduction Map
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {bulkMappings.map((mapping, index) => (
                      <div key={index} className="p-3 bg-muted rounded-lg">
                        <div className="font-medium">{mapping.recipe_ingredient_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Maps to: <span className="font-medium">{mapping.bulk_item_name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Conversion: 1 {mapping.recipe_unit} = 1/{mapping.conversion_factor} {mapping.bulk_unit}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {!readOnly && (
            <div className="flex justify-end mt-6">
              <Button onClick={handleSave}>
                Save Ingredient Breakdown
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
