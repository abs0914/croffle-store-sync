import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Package, 
  Calculator,
  Coffee,
  Cookie,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecipeComponent {
  id: string;
  component_recipe_id: string;
  component_name: string;
  quantity: number;
  is_required: boolean;
  component_type: 'croffle' | 'coffee' | 'addon' | 'sauce';
  price_modifier?: number;
}

interface ComboIngredient {
  id: string;
  ingredient_name: string;
  quantity_multiplier: number;
  component_source: 'primary' | 'secondary' | 'both';
  base_quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface ComboManagementProps {
  formData: any;
  onChange: (updates: any) => void;
  isTemplate?: boolean;
  storeId?: string;
}

export function ComboManagement({
  formData,
  onChange,
  isTemplate,
  storeId
}: ComboManagementProps) {
  const [availableRecipes, setAvailableRecipes] = useState<any[]>([]);
  const [components, setComponents] = useState<RecipeComponent[]>([]);
  const [comboIngredients, setComboIngredients] = useState<ComboIngredient[]>([]);
  const [activeTab, setActiveTab] = useState('components');

  useEffect(() => {
    loadAvailableRecipes();
    initializeComboData();
  }, []);

  const loadAvailableRecipes = async () => {
    try {
      if (isTemplate) {
        const { data } = await supabase
          .from('recipe_templates')
          .select('id, name, recipe_type')
          .eq('is_active', true)
          .in('recipe_type', ['single', 'component'])
          .order('name');
        
        setAvailableRecipes(data || []);
      } else if (storeId) {
        const { data } = await supabase
          .from('recipes')
          .select('id, name, recipe_type')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .in('recipe_type', ['single', 'component'])
          .order('name');
        
        setAvailableRecipes(data || []);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast.error('Failed to load available recipes');
    }
  };

  const initializeComboData = () => {
    // Initialize components from combo_rules
    if (formData.combo_rules?.components) {
      setComponents(formData.combo_rules.components);
    }
    
    // Initialize combo ingredients from combo_rules
    if (formData.combo_rules?.combo_ingredients) {
      setComboIngredients(formData.combo_rules.combo_ingredients);
    }
  };

  const addComponent = () => {
    const newComponent: RecipeComponent = {
      id: `component-${Date.now()}`,
      component_recipe_id: '',
      component_name: '',
      quantity: 1,
      is_required: true,
      component_type: 'croffle',
      price_modifier: 0
    };

    const updatedComponents = [...components, newComponent];
    setComponents(updatedComponents);
    updateComboRules({ components: updatedComponents });
  };

  const updateComponent = (index: number, field: keyof RecipeComponent, value: any) => {
    const updatedComponents = [...components];
    updatedComponents[index] = { ...updatedComponents[index], [field]: value };

    // Auto-fill component name when recipe is selected
    if (field === 'component_recipe_id' && value) {
      const selectedRecipe = availableRecipes.find(r => r.id === value);
      if (selectedRecipe) {
        updatedComponents[index].component_name = selectedRecipe.name;
      }
    }

    setComponents(updatedComponents);
    updateComboRules({ components: updatedComponents });
  };

  const removeComponent = (index: number) => {
    const updatedComponents = components.filter((_, i) => i !== index);
    setComponents(updatedComponents);
    updateComboRules({ components: updatedComponents });
  };

  const addComboIngredient = () => {
    const newIngredient: ComboIngredient = {
      id: `combo-ingredient-${Date.now()}`,
      ingredient_name: '',
      quantity_multiplier: 1,
      component_source: 'both',
      base_quantity: 1,
      unit: 'g',
      cost_per_unit: 0
    };

    const updatedIngredients = [...comboIngredients, newIngredient];
    setComboIngredients(updatedIngredients);
    updateComboRules({ combo_ingredients: updatedIngredients });
  };

  const updateComboIngredient = (index: number, field: keyof ComboIngredient, value: any) => {
    const updatedIngredients = [...comboIngredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setComboIngredients(updatedIngredients);
    updateComboRules({ combo_ingredients: updatedIngredients });
  };

  const removeComboIngredient = (index: number) => {
    const updatedIngredients = comboIngredients.filter((_, i) => i !== index);
    setComboIngredients(updatedIngredients);
    updateComboRules({ combo_ingredients: updatedIngredients });
  };

  const updateComboRules = (updates: any) => {
    const currentRules = formData.combo_rules || {};
    const updatedRules = { ...currentRules, ...updates };
    onChange(prev => ({ ...prev, combo_rules: updatedRules }));
  };

  const calculateComboPrice = () => {
    const basePrices = components.reduce((total, comp) => {
      const recipe = availableRecipes.find(r => r.id === comp.component_recipe_id);
      // In a real implementation, you'd fetch the actual price from the recipe
      const basePrice = 50; // Placeholder
      return total + (basePrice * comp.quantity) + (comp.price_modifier || 0);
    }, 0);

    return basePrices;
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'croffle': return Cookie;
      case 'coffee': return Coffee;
      case 'addon': return Package;
      default: return Package;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Combo Recipe Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Configure components, pricing, and ingredients for this combo recipe.
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="ingredients">Combo Ingredients</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Overview</TabsTrigger>
            </TabsList>

            {/* Components Tab */}
            <TabsContent value="components" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Recipe Components</h3>
                  <p className="text-sm text-muted-foreground">
                    Define which recipes make up this combo
                  </p>
                </div>
                <Button type="button" size="sm" onClick={addComponent}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Component
                </Button>
              </div>

              <div className="space-y-3">
                {components.map((component, index) => {
                  const ComponentIcon = getComponentIcon(component.component_type);
                  return (
                    <Card key={component.id} className="p-4">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-1 flex justify-center">
                          <ComponentIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        
                        <div className="col-span-3">
                          <Label className="text-xs">Recipe</Label>
                          <Select
                            value={component.component_recipe_id}
                            onValueChange={(value) => updateComponent(index, 'component_recipe_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select recipe" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRecipes.map((recipe) => (
                                <SelectItem key={recipe.id} value={recipe.id}>
                                  {recipe.name}
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {recipe.recipe_type}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={component.component_type}
                            onValueChange={(value: any) => updateComponent(index, 'component_type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="croffle">Croffle</SelectItem>
                              <SelectItem value="coffee">Coffee</SelectItem>
                              <SelectItem value="addon">Add-on</SelectItem>
                              <SelectItem value="sauce">Sauce</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={component.quantity}
                            onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Price Modifier</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={component.price_modifier || 0}
                            onChange={(e) => updateComponent(index, 'price_modifier', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="col-span-1 flex items-center space-x-2">
                          <Switch
                            checked={component.is_required}
                            onCheckedChange={(checked) => updateComponent(index, 'is_required', checked)}
                          />
                        </div>

                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeComponent(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}

                {components.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Package className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>No components added yet</p>
                    <p className="text-sm">Add recipe components to build your combo</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Combo Ingredients Tab */}
            <TabsContent value="ingredients" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Combo-Specific Ingredients</h3>
                  <p className="text-sm text-muted-foreground">
                    Additional ingredients that scale with component quantities
                  </p>
                </div>
                <Button type="button" size="sm" onClick={addComboIngredient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Ingredient
                </Button>
              </div>

              <div className="space-y-3">
                {comboIngredients.map((ingredient, index) => (
                  <Card key={ingredient.id} className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs">Ingredient Name</Label>
                        <Input
                          placeholder="e.g., Combo Sauce"
                          value={ingredient.ingredient_name}
                          onChange={(e) => updateComboIngredient(index, 'ingredient_name', e.target.value)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Base Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={ingredient.base_quantity}
                          onChange={(e) => updateComboIngredient(index, 'base_quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="col-span-1">
                        <Label className="text-xs">Unit</Label>
                        <Select
                          value={ingredient.unit}
                          onValueChange={(value) => updateComboIngredient(index, 'unit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="pieces">pieces</SelectItem>
                            <SelectItem value="cups">cups</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Multiplier</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="1.0"
                          value={ingredient.quantity_multiplier}
                          onChange={(e) => updateComboIngredient(index, 'quantity_multiplier', parseFloat(e.target.value) || 1)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Source</Label>
                        <Select
                          value={ingredient.component_source}
                          onValueChange={(value: any) => updateComboIngredient(index, 'component_source', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary Only</SelectItem>
                            <SelectItem value="secondary">Secondary Only</SelectItem>
                            <SelectItem value="both">Both Components</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Cost per Unit</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={ingredient.cost_per_unit}
                          onChange={(e) => updateComboIngredient(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeComboIngredient(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {comboIngredients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Calculator className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>No combo ingredients added yet</p>
                    <p className="text-sm">Add ingredients that scale with component quantities</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Pricing Overview Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Component Breakdown</Label>
                      {components.map((component, index) => (
                        <div key={component.id} className="flex justify-between text-sm">
                          <span>{component.component_name || `Component ${index + 1}`}</span>
                          <span>₱{((50 * component.quantity) + (component.price_modifier || 0)).toFixed(2)}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Estimated Total</span>
                        <span>₱{calculateComboPrice().toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Pricing Matrix Rules</Label>
                      {formData.combo_rules?.pricing_matrix?.length > 0 ? (
                        formData.combo_rules.pricing_matrix.map((rule: any, index: number) => (
                          <div key={index} className="text-sm p-2 bg-muted rounded">
                            <div className="font-medium">{rule.primary_component} + {rule.secondary_component}</div>
                            <div className="text-muted-foreground">₱{rule.price}</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No pricing rules defined in Basic Info</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}