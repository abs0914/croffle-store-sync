import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, RefreshCw, Settings, HelpCircle, Zap, AlertTriangle, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { MixMatchGroupedView } from '@/components/admin/recipe/MixMatchGroupedView';
import { fixForeignMappingsByName } from '@/services/recipeManagement/crossStoreMappingService';

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
  ingredient_group_name?: string;
  is_optional?: boolean;
  display_order?: number;
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

interface DraftIngredient {
  id: string; // temporary ID for UI purposes
  inventory_stock_id: string;
  quantity: number;
  unit: InventoryUnit;
  isDraft: true;
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
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  
  // Draft ingredients state
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);
  
  // Detect if current product is Mix & Match
  const isMixMatchProduct = React.useMemo(() => {
    return recipeIngredients.some(ingredient => ingredient.ingredient_group_name);
  }, [recipeIngredients]);

  // Get current product details
  const selectedProductData = React.useMemo(() => {
    return products.find(p => p.id === selectedProduct);
  }, [products, selectedProduct]);

  // Inventory IDs for current store
  const inventoryIds = React.useMemo(() => new Set(inventoryItems.map(i => i.id)), [inventoryItems]);

  // Ingredients mapped to other stores' inventory
  const foreignMappedIngredients = React.useMemo(() => {
    return recipeIngredients.filter(ing => ing.inventory_stock_id && !inventoryIds.has(ing.inventory_stock_id));
  }, [recipeIngredients, inventoryIds]);

  const foreignMappingsCount = foreignMappedIngredients.length;

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
    // Clear draft ingredients when product changes
    setDraftIngredients([]);
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
      // First, get the recipe ingredients with Mix & Match fields
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('id, recipe_id, inventory_stock_id, quantity, unit, created_at, updated_at, ingredient_group_name, is_optional, display_order')
        .eq('recipe_id', product.recipe_id)
        .order('ingredient_group_name', { nullsFirst: true })
        .order('display_order', { nullsFirst: true });

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
    if (!selectedProduct || inventoryItems.length === 0) {
      toast.error('Please select a product and ensure inventory items are available');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product?.recipe_id) {
      toast.error('Product does not have a recipe associated');
      return;
    }

    // Create a new draft ingredient with empty values
    const newDraftIngredient: DraftIngredient = {
      id: `draft_${Date.now()}`, // temporary ID
      inventory_stock_id: '',
      quantity: 1,
      unit: 'pieces',
      isDraft: true
    };

    setDraftIngredients(prev => [...prev, newDraftIngredient]);
  };

  const saveDraftIngredient = async (draftId: string, draftData: DraftIngredient) => {
    if (!selectedProduct || !draftData.inventory_stock_id) {
      toast.error('Please select an inventory item');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product?.recipe_id) {
      toast.error('Product does not have a recipe associated');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: product.recipe_id,
          inventory_stock_id: draftData.inventory_stock_id,
          quantity: draftData.quantity,
          unit: draftData.unit
        });

      if (error) throw error;

      // Remove from draft ingredients
      setDraftIngredients(prev => prev.filter(draft => draft.id !== draftId));
      
      // Reload recipe ingredients
      await loadRecipeIngredients();
      toast.success('Ingredient saved successfully');

      // If apply to all stores is enabled, deploy changes
      if (applyToAllStores) {
        await deployToAllStores();
      }
    } catch (error) {
      console.error('Error saving ingredient:', error);
      toast.error('Failed to save ingredient');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelDraftIngredient = (draftId: string) => {
    setDraftIngredients(prev => prev.filter(draft => draft.id !== draftId));
  };

  const updateDraftIngredient = (draftId: string, updates: Partial<DraftIngredient>) => {
    setDraftIngredients(prev => 
      prev.map(draft => 
        draft.id === draftId ? { ...draft, ...updates } : draft
      )
    );
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

    // Enhanced validation - prevent deployment if ingredients are unmapped OR have foreign mappings
    const unmappedIngredients = recipeIngredients.filter(ing => !ing.inventory_stock_id);
    const foreignMappedIngredients = recipeIngredients.filter(ing => ing.inventory_stock_id && !inventoryIds.has(ing.inventory_stock_id));
    
    if (unmappedIngredients.length > 0) {
      toast.error(`Cannot deploy: ${unmappedIngredients.length} ingredients are not mapped to inventory items. Please map all ingredients before deploying.`);
      return;
    }
    
    if (foreignMappedIngredients.length > 0) {
      toast.error(`Cannot deploy: ${foreignMappedIngredients.length} ingredients are mapped to other stores' inventory. Please fix foreign mappings before deploying.`);
      return;
    }

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

        // Copy current ingredients to target recipe with per-store inventory matching
        const ingredientInserts: Array<{ recipe_id: string; inventory_stock_id: string | null; quantity: number; unit: InventoryUnit }> = [];

        for (const ing of recipeIngredients) {
          let targetInventoryId: string | null = null;

          // Try to map by inventory item name in the target store
          const sourceItemName = ing.inventory_stock?.item;
          if (sourceItemName) {
            const { data: targetStock, error: targetStockError } = await supabase
              .from('inventory_stock')
              .select('id')
              .eq('store_id', store.id)
              .ilike('item', sourceItemName)
              .maybeSingle();

            if (!targetStockError && targetStock?.id) {
              targetInventoryId = targetStock.id;
            }
          }

          ingredientInserts.push({
            recipe_id: targetRecipeId,
            inventory_stock_id: targetInventoryId,
            quantity: ing.quantity,
            unit: ing.unit
          });
        }

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

  const autoMapIngredients = async () => {
    if (recipeIngredients.length === 0 || inventoryItems.length === 0) return;

    setIsAutoMapping(true);
    try {
      let mappedCount = 0;

      for (const ingredient of recipeIngredients) {
        if (ingredient.inventory_stock_id) continue; // Skip already mapped ingredients

        // Try to find matching inventory item by name similarity
        const currentItemName = ingredient.inventory_stock?.item || '';
        
        // Find best match using fuzzy matching
        const bestMatch = inventoryItems.find(item => 
          item.item.toLowerCase().includes(currentItemName.toLowerCase()) ||
          currentItemName.toLowerCase().includes(item.item.toLowerCase()) ||
          // Common ingredient mappings
          (currentItemName.toLowerCase().includes('water') && item.item.toLowerCase().includes('water')) ||
          (currentItemName.toLowerCase().includes('milk') && item.item.toLowerCase().includes('milk')) ||
          (currentItemName.toLowerCase().includes('sugar') && item.item.toLowerCase().includes('sugar')) ||
          (currentItemName.toLowerCase().includes('flour') && item.item.toLowerCase().includes('flour'))
        );

        if (bestMatch) {
          const { error } = await supabase
            .from('recipe_ingredients')
            .update({ 
              inventory_stock_id: bestMatch.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', ingredient.id);
            
          if (!error) {
            mappedCount++;
          }
        }
      }

      await loadRecipeIngredients();
      
      if (mappedCount > 0) {
        toast.success(`Auto-mapped ${mappedCount} ingredients`);
      } else {
        toast.info('No suitable matches found for auto-mapping');
      }
    } catch (error) {
      console.error('Error auto-mapping ingredients:', error);
      toast.error('Failed to auto-map ingredients');
    } finally {
      setIsAutoMapping(false);
    }
  };

  const fixForeignMappings = async () => {
    if (foreignMappingsCount === 0) {
      toast.info('No foreign mappings found');
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await fixForeignMappingsByName(selectedStore);
      
      if (result) {
        // Reload the recipe ingredients to reflect the changes
        await loadRecipeIngredients();
        
        if (result.fixed_count > 0) {
          toast.success(`Fixed ${result.fixed_count} foreign mappings`);
        } else {
          toast.info('No suitable matches found to remap');
        }
        
        // Log details for debugging
        console.log('Fix foreign mappings result:', result);
      }
    } catch (error) {
      console.error('Error fixing foreign mappings:', error);
      toast.error('Failed to fix foreign mappings');
    } finally {
      setIsSaving(false);
    }
  };

  const getValidationBadge = () => {
    const mapped = recipeIngredients.filter(ing => ing.inventory_stock_id).length;
    const total = recipeIngredients.length;

    if (total === 0) {
      return <Badge variant="destructive">No Ingredients</Badge>;
    }

    // Check for foreign mappings (critical issue)
    if (foreignMappingsCount > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Foreign Mappings ({foreignMappingsCount})
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{foreignMappingsCount} ingredients are mapped to other stores' inventory. Fix these before deployment.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {total - mapped} Unmapped
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{mapped} of {total} ingredients are mapped to inventory items</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
                          <div className="flex items-center justify-between w-full">
                            <span>{product.name || product.product_name}</span>
                            {product.description?.includes('Mix & Match') && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Mix & Match
                              </Badge>
                            )}
                          </div>
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

      {/* Foreign Mappings Warning */}
      {selectedProduct && foreignMappingsCount > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <div className="font-medium text-amber-800">Cross-Store Mapping Issue</div>
                  <div className="text-sm text-amber-700">
                    {foreignMappingsCount} ingredient{foreignMappingsCount === 1 ? ' is' : 's are'} mapped to inventory from other stores.
                    This causes empty dropdowns and will prevent deployment.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fixForeignMappings} 
                  disabled={isSaving}
                  className="border-amber-300 hover:bg-amber-100"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Target className="w-4 h-4 mr-2" />
                  )}
                  Fix Mappings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingredient Management Interface */}
      {selectedProduct && (
        <>
          {isMixMatchProduct ? (
            // Mix & Match Products - Use grouped view
            <MixMatchGroupedView
              product={selectedProductData}
              ingredients={recipeIngredients}
              inventoryItems={inventoryItems}
              isLoading={isLoading}
              isSaving={isSaving}
              onUpdateMapping={updateIngredientMapping}
              onUpdateQuantity={updateIngredientQuantity}
              onDeleteIngredient={deleteIngredient}
              onAddIngredient={addNewIngredient}
              onAutoMap={autoMapIngredients}
              onRefresh={loadRecipeIngredients}
            />
          ) : (
            // Regular Products - Use flat view (existing functionality)
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <span>Regular Product Ingredient Mapping</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getValidationBadge()}
                    <Badge variant="outline">
                      Cost: ₱{calculateTotalCost().toFixed(2)}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">{/* Action Buttons */}
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
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={autoMapIngredients}
                            disabled={isAutoMapping || isSaving || recipeIngredients.length === 0}
                            variant="outline"
                          >
                            {isAutoMapping ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4 mr-2" />
                            )}
                            Auto-Map
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Automatically match ingredients to inventory items based on name similarity</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {applyToAllStores && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={deployToAllStores}
                              disabled={isSaving || recipeIngredients.length === 0 || 
                                recipeIngredients.some(ing => !ing.inventory_stock_id) ||
                                foreignMappingsCount > 0}
                              variant="default"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Deploy to All Stores
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Deploy this recipe configuration to all active stores. 
                              {foreignMappingsCount > 0 ? 'Fix foreign mappings first.' : 'All ingredients must be mapped first.'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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

                {/* Ingredients List - Regular Product View */}
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
                    {recipeIngredients.map((ingredient) => {
                      const isUnmapped = !ingredient.inventory_stock_id;
                      return (
                        <Card 
                          key={ingredient.id} 
                          className={`border-l-4 ${
                            isUnmapped 
                              ? 'border-l-amber-500 bg-amber-50/50' 
                              : 'border-l-primary/50'
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                              {/* Inventory Item Selection */}
                              <div className="md:col-span-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <Label className="text-sm font-medium">Inventory Item</Label>
                                  {isUnmapped && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>This ingredient is not mapped to any inventory item. Select an item to enable cost calculations and deployment.</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                <Select
                                  value={ingredient.inventory_stock_id || ''}
                                  onValueChange={(value) => updateIngredientMapping(ingredient.id, value)}
                                  disabled={isSaving}
                                >
                                  <SelectTrigger className={isUnmapped ? 'border-amber-300 focus:border-amber-500' : ''}>
                                    <SelectValue placeholder="Select inventory item..." />
                                  </SelectTrigger>
                                  <SelectContent>
                    {inventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id} textValue={item.item}>
                          {item.item} ({item.unit} - ₱{item.cost || 0})
                        </SelectItem>
                      ))}
                      {/* Show foreign mapped items that aren't in current store */}
                      {ingredient.inventory_stock_id && !inventoryIds.has(ingredient.inventory_stock_id) && ingredient.inventory_stock?.item && (
                        <SelectItem 
                          key={ingredient.inventory_stock_id} 
                          value={ingredient.inventory_stock_id}
                          textValue={`${ingredient.inventory_stock.item} (other store)`}
                          className="text-amber-700 bg-amber-50"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            {ingredient.inventory_stock.item} (mapped to other store - remap required)
                          </div>
                        </SelectItem>
                      )}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Current Item Display */}
                              <div className="md:col-span-3">
                                <Label className="text-sm font-medium">Selected Item</Label>
                                <div className={`text-sm p-2 rounded ${
                                  isUnmapped 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : 'bg-muted/50'
                                }`}>
                                  {ingredient.inventory_stock?.item || (
                                    <span className="flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Not selected
                                    </span>
                                  )}
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
                            {ingredient.inventory_stock && ingredient.inventory_stock.cost ? (
                              <div className="mt-2 pt-2 border-t border-muted text-sm text-muted-foreground">
                                Cost: ₱{ingredient.inventory_stock.cost}/unit × {ingredient.quantity} = ₱{(ingredient.inventory_stock.cost * ingredient.quantity).toFixed(2)}
                              </div>
                            ) : isUnmapped && (
                              <div className="mt-2 pt-2 border-t border-amber-200 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                Cost calculation unavailable - please map to inventory item
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                   </div>
                 )}

                 {/* Draft Ingredients - Regular Products */}
                 {draftIngredients.map((draft) => (
                   <Card key={draft.id} className="border-l-4 border-l-blue-500 bg-blue-50/50">
                     <CardContent className="p-4">
                       <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                         {/* Inventory Item Selection */}
                         <div className="md:col-span-4">
                           <div className="flex items-center gap-2 mb-1">
                             <Label className="text-sm font-medium">Inventory Item</Label>
                             <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                               Draft
                             </Badge>
                           </div>
                           <Select
                             value={draft.inventory_stock_id}
                             onValueChange={(value) => updateDraftIngredient(draft.id, { inventory_stock_id: value })}
                           >
                             <SelectTrigger className="border-blue-300 focus:border-blue-500">
                               <SelectValue placeholder="Select inventory item..." />
                             </SelectTrigger>
                             <SelectContent>
                               {inventoryItems.map(item => (
                                 <SelectItem key={item.id} value={item.id} textValue={item.item}>
                                   {item.item} ({item.unit} - ₱{item.cost || 0})
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>

                         {/* Selected Item Display */}
                         <div className="md:col-span-3">
                           <Label className="text-sm font-medium">Selected Item</Label>
                           <div className="text-sm p-2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                             {draft.inventory_stock_id ? 
                               inventoryItems.find(item => item.id === draft.inventory_stock_id)?.item || 'Item not found' :
                               'Not selected'
                             }
                           </div>
                         </div>

                         {/* Quantity */}
                         <div className="md:col-span-2">
                           <Label className="text-sm font-medium">Quantity</Label>
                           <Input
                             type="number"
                             value={draft.quantity}
                             onChange={(e) => updateDraftIngredient(draft.id, { quantity: parseFloat(e.target.value) || 0 })}
                             className="text-sm"
                             min="0"
                             step="0.1"
                           />
                         </div>

                         {/* Unit */}
                         <div className="md:col-span-2">
                           <Label className="text-sm font-medium">Unit</Label>
                           <div className="text-sm bg-muted/50 p-2 rounded">
                             {draft.inventory_stock_id ? 
                               inventoryItems.find(item => item.id === draft.inventory_stock_id)?.unit || draft.unit :
                               draft.unit
                             }
                           </div>
                         </div>

                         {/* Actions */}
                         <div className="md:col-span-1 flex justify-end gap-1">
                           <Button
                             onClick={() => saveDraftIngredient(draft.id, draft)}
                             disabled={isSaving || !draft.inventory_stock_id}
                             variant="default"
                             size="sm"
                           >
                             {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                           </Button>
                           <Button
                             onClick={() => cancelDraftIngredient(draft.id)}
                             disabled={isSaving}
                             variant="ghost"
                             size="sm"
                           >
                             <Trash2 className="w-3 h-3 text-destructive" />
                           </Button>
                         </div>
                       </div>

                       {/* Draft Instructions */}
                       <div className="mt-2 pt-2 border-t border-blue-200 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                         <div className="flex items-center gap-1">
                           <HelpCircle className="w-4 h-4" />
                           Select an inventory item and click the save button to add this ingredient
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 ))}

                 {/* Summary Information - Regular Products */}
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
        </>
      )}
    </div>
  );
};