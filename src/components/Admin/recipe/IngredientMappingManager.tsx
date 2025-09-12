import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IngredientMappingManagerProps {
  onStatusChange?: (status: 'loading' | 'complete' | 'error') => void;
}

interface StoreMappingStatus {
  id: string;
  name: string;
  totalIngredients: number;
  mappedIngredients: number;
  unmappedIngredients: string[];
  progress: number;
}

export const IngredientMappingManager: React.FC<IngredientMappingManagerProps> = ({
  onStatusChange
}) => {
  const [stores, setStores] = useState<StoreMappingStatus[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  useEffect(() => {
    loadStoreData();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadInventoryItems(selectedStore);
    }
  }, [selectedStore]);

  const loadStoreData = async () => {
    setLoading(true);
    onStatusChange?.('loading');
    
    try {
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (storeError) throw storeError;

      const storeStatuses: StoreMappingStatus[] = [];

      for (const store of storeData || []) {
        // Get unique recipe ingredients for this store using the new view
        const { data: recipeIngredients, error: ingredientsError } = await supabase
          .from('recipe_ingredients_with_names')
          .select('ingredient_name, inventory_stock_id')
          .eq('store_id', store.id);

        if (ingredientsError) {
          console.error(`Error loading ingredients for store ${store.name}:`, ingredientsError);
          continue;
        }

        const uniqueIngredients = Array.from(
          new Set(recipeIngredients?.map(ri => ri.ingredient_name).filter(Boolean) || [])
        );

        const mappedIngredients = Array.from(
          new Set(
            recipeIngredients
              ?.filter(ri => ri.inventory_stock_id && ri.ingredient_name)
              .map(ri => ri.ingredient_name) || []
          )
        );

        const unmappedIngredients = uniqueIngredients.filter(ing => !mappedIngredients.includes(ing));

        storeStatuses.push({
          id: store.id,
          name: store.name,
          totalIngredients: uniqueIngredients.length,
          mappedIngredients: mappedIngredients.length,
          unmappedIngredients,
          progress: uniqueIngredients.length > 0 
            ? Math.round((mappedIngredients.length / uniqueIngredients.length) * 100)
            : 100
        });
      }

      setStores(storeStatuses);
      onStatusChange?.(storeStatuses.every(s => s.progress === 100) ? 'complete' : 'error');
    } catch (error) {
      console.error('Error loading store data:', error);
      toast.error('Failed to load mapping status');
      onStatusChange?.('error');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryItems = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('item');

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const handleIngredientMapping = async (ingredientName: string, inventoryId: string | null) => {
    if (!selectedStore) return;

    setUpdating(true);
    
    try {
      console.log(`Mapping "${ingredientName}" to inventory ID: ${inventoryId}`);

      // Get all recipe ingredients that need to be updated using the new view
      const { data: recipeIngredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients_with_names')
        .select('id, recipe_id')
        .eq('store_id', selectedStore)
        .eq('ingredient_name', ingredientName);

      if (ingredientsError) throw ingredientsError;

      if (!recipeIngredients || recipeIngredients.length === 0) {
        toast.error('No recipe ingredients found to update');
        return;
      }

      const recipeIngredientIds = recipeIngredients.map(ri => ri.id);

      // Update recipe ingredients table - this is now the single source of truth
      const { error: updateError } = await supabase
        .from('recipe_ingredients')
        .update({ inventory_stock_id: inventoryId })
        .in('id', recipeIngredientIds);

      if (updateError) {
        console.error('Error updating recipe ingredients:', updateError);
        toast.error('Failed to update recipe ingredients');
        return;
      }

      toast.success(`Successfully ${inventoryId ? 'mapped' : 'unmapped'} "${ingredientName}"`);
      
      // Reload data to reflect changes
      await loadStoreData();
      
    } catch (error) {
      console.error('Error updating ingredient mapping:', error);
      toast.error('Failed to update ingredient mapping');
    } finally {
      setUpdating(false);
    }
  };

  const selectedStoreData = stores.find(s => s.id === selectedStore);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading mapping status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Store Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ingredient Mapping Status</span>
            <Button onClick={loadStoreData} variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Card 
                key={store.id} 
                className={`cursor-pointer transition-colors ${
                  selectedStore === store.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedStore(store.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{store.name}</h4>
                    {store.progress === 100 ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{store.progress}%</span>
                    </div>
                    <Progress value={store.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Mapped: {store.mappedIngredients}</span>
                      <span>Total: {store.totalIngredients}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Store Details */}
      {selectedStoreData && (
        <Card>
          <CardHeader>
            <CardTitle>
              Unmapped Ingredients - {selectedStoreData.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStoreData.unmappedIngredients.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-center">
                <div>
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Ingredients Mapped!</h3>
                  <p className="text-muted-foreground">
                    All ingredients in this store have been successfully mapped to inventory items.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedStoreData.unmappedIngredients.map((ingredient) => (
                  <div key={ingredient} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{ingredient}</h4>
                      <p className="text-sm text-muted-foreground">
                        Not mapped to any inventory item
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(value) => handleIngredientMapping(ingredient, value)}
                        disabled={updating}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Select inventory item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.item} ({item.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};