import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Package, Save, X, Plus, Trash2, Zap } from 'lucide-react';

interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  estimated_cost: number;
  serving_size: number;
  prep_time_minutes: number;
  recipe_type: string;
  is_active: boolean;
}

interface TemplateIngredient {
  id?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  notes?: string;
}

interface RecipeTemplateEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: RecipeTemplate | null;
}

export const RecipeTemplateEditDialog: React.FC<RecipeTemplateEditDialogProps> = ({
  isOpen,
  onClose,
  template
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    serving_size: 1,
    prep_time_minutes: 0,
    recipe_type: 'main_dish',
    is_active: true
  });
  const [ingredients, setIngredients] = useState<TemplateIngredient[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState('');

  useEffect(() => {
    if (template && isOpen) {
      setFormData({
        name: template.name,
        description: template.description || '',
        instructions: template.instructions || '',
        serving_size: template.serving_size,
        prep_time_minutes: template.prep_time_minutes,
        recipe_type: template.recipe_type,
        is_active: template.is_active
      });
      loadTemplateIngredients();
    } else if (isOpen) {
      // Reset for new template
      setFormData({
        name: '',
        description: '',
        instructions: '',
        serving_size: 1,
        prep_time_minutes: 0,
        recipe_type: 'main_dish',
        is_active: true
      });
      setIngredients([]);
    }
    
    if (isOpen) {
      loadStores();
    }
  }, [template, isOpen]);

  useEffect(() => {
    // Calculate total cost whenever ingredients change
    const total = ingredients.reduce((sum, ing) => sum + (ing.quantity * ing.cost_per_unit), 0);
    setTotalCost(total);
  }, [ingredients]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const loadTemplateIngredients = async () => {
    if (!template) return;

    try {
      const { data, error } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', template.id);

      if (error) throw error;
      setIngredients(
        data?.map(item => ({
          id: item.id,
          ingredient_name: item.ingredient_name,
          quantity: item.quantity,
          unit: item.unit,
          cost_per_unit: item.cost_per_unit,
          notes: item.notes
        })) || []
      );
    } catch (error) {
      console.error('Error loading template ingredients:', error);
      toast.error('Failed to load template ingredients');
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setLoading(true);
    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions,
        estimated_cost: totalCost,
        serving_size: formData.serving_size,
        prep_time_minutes: formData.prep_time_minutes,
        recipe_type: formData.recipe_type,
        is_active: formData.is_active
      };

      if (template) {
        // Update existing template
        const { error: templateError } = await supabase
          .from('recipe_templates')
          .update(templateData)
          .eq('id', template.id);

        if (templateError) throw templateError;

        // Delete existing ingredients
        await supabase
          .from('recipe_template_ingredients')
          .delete()
          .eq('recipe_template_id', template.id);

        // Insert updated ingredients
        if (ingredients.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('recipe_template_ingredients')
            .insert(
              ingredients.map(ing => ({
                recipe_template_id: template.id,
                ingredient_name: ing.ingredient_name,
                quantity: ing.quantity,
                unit: ing.unit,
                cost_per_unit: ing.cost_per_unit,
                notes: ing.notes,
                location_type: 'all',
                uses_store_inventory: true
              }))
            );

          if (ingredientsError) throw ingredientsError;
        }

        toast.success('Template updated successfully');
      } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from('recipe_templates')
          .insert(templateData)
          .select()
          .single();

        if (templateError) throw templateError;

        // Insert ingredients
        if (ingredients.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('recipe_template_ingredients')
            .insert(
              ingredients.map(ing => ({
                recipe_template_id: newTemplate.id,
                ingredient_name: ing.ingredient_name,
                quantity: ing.quantity,
                unit: ing.unit,
                cost_per_unit: ing.cost_per_unit,
                notes: ing.notes,
                location_type: 'all',
                uses_store_inventory: true
              }))
            );

          if (ingredientsError) throw ingredientsError;
        }

        toast.success('Template created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['recipe_templates'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployToStore = async () => {
    if (!selectedStore || !template) {
      toast.error('Please select a store to deploy to');
      return;
    }

    setDeployLoading(true);
    try {
      // Import and use the deployment service
      const { InventoryBasedRecipeService } = await import('@/services/inventoryBasedRecipeService');
      const result = await InventoryBasedRecipeService.deployTemplateToStore(template.id, selectedStore);

      if (result.success) {
        toast.success(result.message);
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else {
        toast.error(result.message);
        if (result.missingIngredients?.length) {
          toast.error(`Missing ingredients: ${result.missingIngredients.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('Error deploying template:', error);
      toast.error('Failed to deploy template');
    } finally {
      setDeployLoading(false);
    }
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        ingredient_name: '',
        quantity: 0,
        unit: '',
        cost_per_unit: 0,
        notes: ''
      }
    ]);
  };

  const updateIngredient = (index: number, field: keyof TemplateIngredient, value: any) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {template ? 'Edit Recipe Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter template name..."
                  />
                </div>
                <div>
                  <Label htmlFor="recipe_type">Recipe Type</Label>
                  <Select
                    value={formData.recipe_type}
                    onValueChange={(value) => setFormData({ ...formData, recipe_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main_dish">Main Dish</SelectItem>
                      <SelectItem value="appetizer">Appetizer</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                      <SelectItem value="beverage">Beverage</SelectItem>
                      <SelectItem value="side_dish">Side Dish</SelectItem>
                      <SelectItem value="pastry">Pastry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the recipe template..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Step by step instructions..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serving_size">Serving Size</Label>
                  <Input
                    id="serving_size"
                    type="number"
                    min="1"
                    value={formData.serving_size}
                    onChange={(e) => setFormData({ ...formData, serving_size: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label htmlFor="prep_time">Prep Time (minutes)</Label>
                  <Input
                    id="prep_time"
                    type="number"
                    min="0"
                    value={formData.prep_time_minutes}
                    onChange={(e) => setFormData({ ...formData, prep_time_minutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Template Ingredients</CardTitle>
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
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-medium">Ingredient {index + 1}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIngredient(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Ingredient Name</Label>
                            <Input
                              value={ingredient.ingredient_name}
                              onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                              placeholder="Enter ingredient name..."
                            />
                          </div>
                          <div>
                            <Label>Unit</Label>
                            <Select
                              value={ingredient.unit}
                              onValueChange={(value) => updateIngredient(index, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="piece">Piece</SelectItem>
                                <SelectItem value="serving">Serving</SelectItem>
                                <SelectItem value="cup">Cup</SelectItem>
                                <SelectItem value="gram">Gram</SelectItem>
                                <SelectItem value="ml">ML</SelectItem>
                                <SelectItem value="tbsp">Tablespoon</SelectItem>
                                <SelectItem value="tsp">Teaspoon</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={ingredient.quantity}
                              onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label>Cost per Unit</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={ingredient.cost_per_unit}
                              onChange={(e) => updateIngredient(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <Label>Notes (Optional)</Label>
                          <Input
                            value={ingredient.notes || ''}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                            placeholder="Any special notes..."
                          />
                        </div>

                        {ingredient.quantity > 0 && ingredient.cost_per_unit > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex justify-between text-sm">
                              <span>Total Cost:</span>
                              <span className="font-medium">
                                ₱{(ingredient.quantity * ingredient.cost_per_unit).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {ingredients.length > 0 && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Template Cost:</span>
                    <Badge variant="secondary" className="text-lg">
                      ₱{totalCost.toFixed(2)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Cost per serving: ₱{(totalCost / formData.serving_size).toFixed(2)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deployment Section */}
          {template && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Deploy Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Select Store to Deploy</Label>
                    <Select
                      value={selectedStore}
                      onValueChange={setSelectedStore}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a store..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleDeployToStore}
                    disabled={!selectedStore || deployLoading}
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {deployLoading ? 'Deploying...' : 'Deploy'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};