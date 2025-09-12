import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchProductRecipeIngredients,
  fetchInventoryStock,
  updateRecipeIngredientMapping,
  bulkUpdateRecipeIngredientMappings,
  createRecipeIngredient,
  deleteRecipeIngredient,
  validateRecipeIngredientMappings,
  calculateRecipeCost,
  autoMapIngredients,
  type RecipeIngredientWithNames,
  type InventoryStockItem
} from '@/utils/ingredientMapping';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProductIngredientMappingTabProps {
  selectedStore: string;
  products: any[];
}

interface ProductSummary {
  id: string;
  name: string;
  category: string;
  totalIngredients: number;
  mappedIngredients: number;
  unmappedIngredients: number;
  mappingStatus: 'complete' | 'partial' | 'missing';
  totalCost: number;
}

export const ProductIngredientMappingTab: React.FC<ProductIngredientMappingTabProps> = ({
  selectedStore,
  products
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredientWithNames[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryStockItem[]>([]);
  const [productSummaries, setProductSummaries] = useState<ProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    unmappedCount: number;
    totalCount: number;
  } | null>(null);
  const [recipeCost, setRecipeCost] = useState<number>(0);

  // Load inventory items when store changes
  useEffect(() => {
    if (selectedStore) {
      loadInventoryItems();
      loadProductSummaries();
    }
  }, [selectedStore]);

  // Load recipe ingredients when product changes
  useEffect(() => {
    if (selectedProduct) {
      loadRecipeIngredients();
    } else {
      setRecipeIngredients([]);
      setValidationStatus(null);
      setRecipeCost(0);
    }
  }, [selectedProduct]);

  const loadInventoryItems = async () => {
    if (!selectedStore) return;
    
    try {
      const items = await fetchInventoryStock(selectedStore);
      setInventoryItems(items);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const loadProductSummaries = async () => {
    if (!selectedStore || !products.length) return;

    const summaries: ProductSummary[] = [];

    for (const product of products) {
      try {
        // Only process products that have a recipe_id
        if (!product.recipe_id) continue;

        const ingredients = await fetchProductRecipeIngredients(product.id, selectedStore);
        const mapped = ingredients.filter(ing => ing.inventory_stock_id).length;
        const unmapped = ingredients.length - mapped;
        
        let status: 'complete' | 'partial' | 'missing' = 'missing';
        if (ingredients.length === 0) {
          status = 'missing';
        } else if (mapped === ingredients.length) {
          status = 'complete';
        } else if (mapped > 0) {
          status = 'partial';
        }

        const cost = ingredients.reduce((total, ing) => 
          total + (ing.quantity * ing.cost_per_unit), 0
        );

        summaries.push({
          id: product.id,
          name: product.name || product.product_name,
          category: product.category?.name || 'Unknown',
          totalIngredients: ingredients.length,
          mappedIngredients: mapped,
          unmappedIngredients: unmapped,
          mappingStatus: status,
          totalCost: cost
        });
      } catch (error) {
        console.error(`Error loading summary for product ${product.name}:`, error);
      }
    }

    setProductSummaries(summaries);
  };

  const loadRecipeIngredients = async () => {
    if (!selectedProduct) return;

    setIsLoading(true);
    try {
      const ingredients = await fetchProductRecipeIngredients(selectedProduct, selectedStore);
      setRecipeIngredients(ingredients);

      // Calculate validation status
      const mapped = ingredients.filter(ing => ing.inventory_stock_id).length;
      setValidationStatus({
        isValid: mapped === ingredients.length && ingredients.length > 0,
        unmappedCount: ingredients.length - mapped,
        totalCount: ingredients.length
      });

      // Calculate cost
      const cost = ingredients.reduce((total, ing) => 
        total + (ing.quantity * ing.cost_per_unit), 0
      );
      setRecipeCost(cost);

    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
      toast.error('Failed to load recipe ingredients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingUpdate = async (ingredientId: string, inventoryStockId: string) => {
    setIsSaving(true);
    try {
      const result = await updateRecipeIngredientMapping(ingredientId, inventoryStockId);
      
      if (result.success) {
        // Reload data to get updated names
        await loadRecipeIngredients();
        await loadProductSummaries();
      }
    } catch (error) {
      console.error('Error updating mapping:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoMap = async () => {
    if (!selectedProduct) return;

    // Find the recipe ID for this product
    const product = products.find(p => p.id === selectedProduct);
    if (!product?.recipe_id) {
      toast.error('No recipe found for this product');
      return;
    }

    setIsSaving(true);
    try {
      const result = await autoMapIngredients(product.recipe_id, selectedStore);
      
      if (result.success && result.mappedCount > 0) {
        await loadRecipeIngredients();
        await loadProductSummaries();
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      console.error('Error in auto-map:', error);
      toast.error('Failed to auto-map ingredients');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedProduct || inventoryItems.length === 0) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product?.recipe_id) return;

    const firstInventoryItem = inventoryItems[0];
    
    setIsSaving(true);
    try {
      const result = await createRecipeIngredient(
        product.recipe_id,
        firstInventoryItem.id,
        1,
        firstInventoryItem.unit,
        firstInventoryItem.cost_per_unit
      );

      if (result.success) {
        await loadRecipeIngredients();
        await loadProductSummaries();
        toast.success('New ingredient added');
      }
    } catch (error) {
      console.error('Error adding ingredient:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    setIsSaving(true);
    try {
      const result = await deleteRecipeIngredient(ingredientId);
      
      if (result.success) {
        await loadRecipeIngredients();
        await loadProductSummaries();
      }
    } catch (error) {
      console.error('Error deleting ingredient:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getValidationBadge = () => {
    if (!validationStatus) return null;

    if (validationStatus.isValid) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          All Mapped ({validationStatus.totalCount})
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        {validationStatus.unmappedCount} Unmapped
      </Badge>
    );
  };

  const getStatusBadge = (status: 'complete' | 'partial' | 'missing') => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'missing':
        return <Badge variant="destructive">Missing</Badge>;
    }
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
      {/* Product Summaries Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Product Mapping Overview</span>
            <Button
              onClick={loadProductSummaries}
              disabled={isLoading}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productSummaries.map((summary) => (
              <Card 
                key={summary.id} 
                className={`cursor-pointer transition-colors ${
                  selectedProduct === summary.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedProduct(summary.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{summary.name}</h4>
                    {getStatusBadge(summary.mappingStatus)}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{summary.category}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Mapped:</span>
                      <span className="ml-1 font-medium">{summary.mappedIngredients}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-1 font-medium">{summary.totalIngredients}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="ml-1 font-medium">₱{summary.totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Product Ingredient Mapping */}
      {selectedProduct && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ingredient Mapping</span>
              {validationStatus && (
                <div className="flex items-center gap-2">
                  {getValidationBadge()}
                  {recipeCost > 0 && (
                    <Badge variant="outline">
                      Cost: ₱{recipeCost.toFixed(2)}
                    </Badge>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button
                  onClick={handleAutoMap}
                  disabled={isSaving || isLoading || recipeIngredients.length === 0}
                  variant="outline"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Auto-Map Ingredients
                </Button>
                
                <Button
                  onClick={handleAddIngredient}
                  disabled={isSaving || inventoryItems.length === 0}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Ingredient
                </Button>
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
                  No ingredients found for this product recipe.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {recipeIngredients.map((ingredient) => (
                  <Card key={ingredient.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Inventory Item Selection */}
                        <div className="md:col-span-4">
                          <Label className="text-sm font-medium">Inventory Item</Label>
                          <Select
                            value={ingredient.inventory_stock_id || ''}
                            onValueChange={(value) => handleMappingUpdate(ingredient.id, value)}
                            disabled={isSaving}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select inventory item..." />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item} ({item.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Current Name Display */}
                        <div className="md:col-span-3">
                          <Label className="text-sm font-medium">Ingredient Name</Label>
                          <div className="text-sm bg-muted/50 p-2 rounded">
                            {ingredient.ingredient_name || 'Not mapped'}
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Quantity</Label>
                          <Input
                            type="number"
                            value={ingredient.quantity}
                            className="text-sm"
                            readOnly
                          />
                        </div>

                        {/* Unit */}
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium">Unit</Label>
                          <Input
                            value={ingredient.unit}
                            className="text-sm"
                            readOnly
                          />
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex justify-end">
                          <Button
                            onClick={() => handleDeleteIngredient(ingredient.id)}
                            disabled={isSaving}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Cost Information */}
                      <div className="mt-2 pt-2 border-t border-muted text-sm text-muted-foreground">
                        Cost: ₱{ingredient.cost_per_unit}/unit × {ingredient.quantity} = ₱{(ingredient.cost_per_unit * ingredient.quantity).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary */}
            {validationStatus && recipeIngredients.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <strong>Total Ingredients:</strong> {validationStatus.totalCount}
                    </div>
                    <div>
                      <strong>Mapped:</strong> {validationStatus.totalCount - validationStatus.unmappedCount}
                    </div>
                    <div>
                      <strong>Unmapped:</strong> {validationStatus.unmappedCount}
                    </div>
                    <div>
                      <strong>Total Cost:</strong> ₱{recipeCost.toFixed(2)}
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