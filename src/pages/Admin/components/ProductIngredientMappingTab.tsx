import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface ProductIngredientMappingTabProps {
  selectedStore: string;
  products: any[];
}

type InventoryUnit = "kg" | "g" | "pieces" | "liters" | "ml" | "boxes" | "packs";

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_stock_id: string;
  quantity: number;
  unit: InventoryUnit;
  created_at: string;
  updated_at: string | null;
  inventory_stock?: {
    id: string;
    item: string;
    unit: InventoryUnit;
    cost: number | null;
  } | null;
}

interface InventoryItem {
  id: string;
  item: string;
  unit: InventoryUnit;
  cost: number | null;
  store_id: string;
  is_active: boolean | null;
}

export const ProductIngredientMappingTab: React.FC<ProductIngredientMappingTabProps> = ({
  selectedStore,
  products
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [applyToAllStores, setApplyToAllStores] = useState(false);

  // Load inventory items when store changes
  useEffect(() => {
    if (selectedStore) {
      loadInventoryItems();
    }
  }, [selectedStore]);

  // Load recipe ingredients when product changes
  useEffect(() => {
    if (selectedProduct) {
      loadRecipeIngredients();
    } else {
      setRecipeIngredients([]);
    }
  }, [selectedProduct]);

  const loadInventoryItems = async () => {
    if (!selectedStore) return;
    
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, cost, store_id, is_active')
        .eq('store_id', selectedStore)
        .eq('is_active', true)
        .order('item');

      if (error) throw error;
      setInventoryItems((data || []) as InventoryItem[]);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const loadRecipeIngredients = async () => {
    if (!selectedProduct) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product?.recipe_id) {
      toast.error('No recipe found for this product');
      return;
    }

    setIsLoading(true);
    try {
      // First, get the recipe ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('id, recipe_id, inventory_stock_id, quantity, unit, created_at, updated_at')
        .eq('recipe_id', product.recipe_id);

      if (ingredientsError) throw ingredientsError;

      // Then get inventory stock details for the mapped ingredients
      const stockIds = (ingredientsData || [])
        .map(ing => ing.inventory_stock_id)
        .filter(Boolean);

      let inventoryStockMap: Record<string, any> = {};
      
      if (stockIds.length > 0) {
        const { data: stockData, error: stockError } = await supabase
          .from('inventory_stock')
          .select('id, item, unit, cost')
          .in('id', stockIds);

        if (stockError) throw stockError;

        // Create a map for quick lookup
        inventoryStockMap = (stockData || []).reduce((acc, stock) => {
          acc[stock.id] = stock;
          return acc;
        }, {} as Record<string, any>);
      }

      // Combine the data
      const combinedData = (ingredientsData || []).map(ingredient => ({
        ...ingredient,
        inventory_stock: ingredient.inventory_stock_id ? inventoryStockMap[ingredient.inventory_stock_id] || null : null
      }));

      setRecipeIngredients(combinedData as RecipeIngredient[]);
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      toast.error('Failed to load recipe ingredients');
    } finally {
      setIsLoading(false);
    }
  };

  const updateIngredientMapping = async (ingredientId: string, inventoryStockId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .update({ 
          inventory_stock_id: inventoryStockId,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredientId);

      if (error) throw error;

      await loadRecipeIngredients();
      toast.success('Ingredient mapping updated');

      // If apply to all stores is enabled, deploy changes
      if (applyToAllStores) {
        await deployToAllStores();
      }
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast.error('Failed to update ingredient mapping');
    } finally {
      setIsSaving(false);
    }
  };

  const updateIngredientQuantity = async (ingredientId: string, quantity: number) => {
    if (quantity <= 0) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredientId);

      if (error) throw error;

      await loadRecipeIngredients();
      toast.success('Quantity updated');

      // If apply to all stores is enabled, deploy changes
      if (applyToAllStores) {
        await deployToAllStores();
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    } finally {
      setIsSaving(false);
    }
  };

  const addNewIngredient = async () => {
    if (!selectedProduct || inventoryItems.length === 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product?.recipe_id) return;

    const firstInventoryItem = inventoryItems[0];
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: product.recipe_id,
          inventory_stock_id: firstInventoryItem.id,
          quantity: 1,
          unit: firstInventoryItem.unit
        });

      if (error) throw error;

      await loadRecipeIngredients();
      toast.success('New ingredient added');

      // If apply to all stores is enabled, deploy changes
      if (applyToAllStores) {
        await deployToAllStores();
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
      toast.error('Failed to add ingredient');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteIngredient = async (ingredientId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', ingredientId);

      if (error) throw error;

      await loadRecipeIngredients();
      toast.success('Ingredient removed');

      // If apply to all stores is enabled, deploy changes
      if (applyToAllStores) {
        await deployToAllStores();
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      toast.error('Failed to remove ingredient');
    } finally {
      setIsSaving(false);
    }
  };

  const deployToAllStores = async () => {
    if (!selectedProduct) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product?.recipe_id) return;

    try {
      // Get all active stores
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (storesError) throw storesError;

      let deployedCount = 0;
      for (const store of stores || []) {
        if (store.id === selectedStore) continue; // Skip current store

        // Find existing recipes for this product in other stores
        const { data: existingRecipes, error: recipesError } = await supabase
          .from('recipes')
          .select('id')
          .eq('name', product.name || product.product_name)
          .eq('store_id', store.id)
          .eq('is_active', true);

        if (recipesError) continue;

        let targetRecipeId: string;

        if (existingRecipes && existingRecipes.length > 0) {
          // Use existing recipe
          targetRecipeId = existingRecipes[0].id;
        } else {
          // Create new recipe
          const { data: newRecipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
              name: product.name || product.product_name,
              store_id: store.id,
              template_id: product.recipe_id,
              is_active: true,
              serving_size: 1,
              instructions: 'Auto-deployed from admin'
            })
            .select()
            .single();

          if (recipeError) continue;
          targetRecipeId = newRecipe.id;
        }

        // Clear existing ingredients
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', targetRecipeId);

        // Copy current ingredients to target recipe
        const ingredientInserts = recipeIngredients
          .filter(ing => ing.inventory_stock_id)
          .map(ing => ({
            recipe_id: targetRecipeId,
            inventory_stock_id: ing.inventory_stock_id,
            quantity: ing.quantity,
            unit: ing.unit
          }));

        if (ingredientInserts.length > 0) {
          await supabase
            .from('recipe_ingredients')
            .insert(ingredientInserts);
        }

        deployedCount++;
      }

      if (deployedCount > 0) {
        toast.success(`Recipe deployed to ${deployedCount} stores`);
      }
    } catch (error) {
      console.error('Error deploying to all stores:', error);
      toast.error('Failed to deploy to all stores');
    }
  };

  const getValidationBadge = () => {
    const mapped = recipeIngredients.filter(ing => ing.inventory_stock_id).length;
    const total = recipeIngredients.length;

    if (total === 0) {
      return <Badge variant="destructive">No Ingredients</Badge>;
    }

    if (mapped === total) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          All Mapped ({total})
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        {total - mapped} Unmapped
      </Badge>
    );
  };

  const calculateTotalCost = () => {
    return recipeIngredients.reduce((total, ing) => {
      const cost = ing.inventory_stock?.cost || 0;
      return total + (ing.quantity * cost);
    }, 0);
  };

  if (!selectedStore) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a store to manage ingredient mappings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Product to Manage Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label>Product</Label>
                <Select
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                  disabled={!selectedStore}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter(p => p.recipe_id) // Only show products with recipes
                      .map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name || product.product_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="apply-all-stores"
                    checked={applyToAllStores}
                    onCheckedChange={setApplyToAllStores}
                  />
                  <Label htmlFor="apply-all-stores" className="text-sm">
                    Apply changes to all stores
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredient Management Interface */}
      {selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Product Ingredient Mapping</span>
              <div className="flex items-center gap-2">
                {getValidationBadge()}
                <Badge variant="outline">
                  Cost: ₱{calculateTotalCost().toFixed(2)}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  onClick={addNewIngredient}
                  disabled={isSaving || inventoryItems.length === 0}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
                
                {applyToAllStores && (
                  <Button
                    onClick={deployToAllStores}
                    disabled={isSaving || recipeIngredients.length === 0}
                    variant="default"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Deploy to All Stores
                  </Button>
                )}
              </div>

              <Button
                onClick={loadRecipeIngredients}
                disabled={isLoading}
                variant="ghost"
                size="sm"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </Button>
            </div>

            <Separator />

            {/* Ingredients List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading ingredients...
              </div>
            ) : recipeIngredients.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No ingredients found for this product recipe. Add ingredients to get started.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {recipeIngredients.map((ingredient) => (
                  <Card key={ingredient.id} className="border-l-4 border-l-primary/50">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Inventory Item Selection */}
                        <div className="md:col-span-4">
                          <Label className="text-sm font-medium">Inventory Item</Label>
                          <Select
                            value={ingredient.inventory_stock_id || ''}
                            onValueChange={(value) => updateIngredientMapping(ingredient.id, value)}
                            disabled={isSaving}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select inventory item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item} ({item.unit} - ₱{item.cost || 0})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Current Item Display */}
                        <div className="md:col-span-3">
                          <Label className="text-sm font-medium">Selected Item</Label>
                          <div className="text-sm bg-muted/50 p-2 rounded">
                            {ingredient.inventory_stock?.item || 'Not selected'}
                          </div>
                        </div>

                        {/* Quantity (Editable) */}
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Quantity</Label>
                          <Input
                            type="number"
                            value={ingredient.quantity}
                            onChange={(e) => {
                              const newQuantity = parseFloat(e.target.value) || 0;
                              if (newQuantity !== ingredient.quantity) {
                                updateIngredientQuantity(ingredient.id, newQuantity);
                              }
                            }}
                            className="text-sm"
                            disabled={isSaving}
                            min="0"
                            step="0.1"
                          />
                        </div>

                        {/* Unit Display */}
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Unit</Label>
                          <div className="text-sm bg-muted/50 p-2 rounded">
                            {ingredient.inventory_stock?.unit || ingredient.unit}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex justify-end">
                          <Button
                            onClick={() => deleteIngredient(ingredient.id)}
                            disabled={isSaving}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Cost Information */}
                      {ingredient.inventory_stock && ingredient.inventory_stock.cost && (
                        <div className="mt-2 pt-2 border-t border-muted text-sm text-muted-foreground">
                          Cost: ₱{ingredient.inventory_stock.cost}/unit × {ingredient.quantity} = ₱{(ingredient.inventory_stock.cost * ingredient.quantity).toFixed(2)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary Information */}
            {recipeIngredients.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Ingredients:</span>
                      <span className="ml-1 font-medium">{recipeIngredients.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mapped:</span>
                      <span className="ml-1 font-medium">
                        {recipeIngredients.filter(ing => ing.inventory_stock_id).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Cost:</span>
                      <span className="ml-1 font-medium">₱{calculateTotalCost().toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="ml-1">
                        {recipeIngredients.filter(ing => ing.inventory_stock_id).length === recipeIngredients.length 
                          ? '✅ Complete' 
                          : '⚠️ Incomplete'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};