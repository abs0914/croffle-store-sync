import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplate } from '@/services/recipeManagement/types';

interface RecipeDeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: RecipeTemplate | null;
  onSuccess: () => void;
}

interface Store {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
}

interface StoreWithDeploymentStatus extends Store {
  isAlreadyDeployed: boolean;
  existingRecipeId?: string;
}

export const RecipeDeploymentDialog: React.FC<RecipeDeploymentDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess
}) => {
  const [stores, setStores] = useState<StoreWithDeploymentStatus[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (isOpen && template) {
      fetchStoresWithDeploymentStatus();
      setSelectedStoreIds([]);
    }
  }, [isOpen, template]);

  const fetchStoresWithDeploymentStatus = async () => {
    if (!template) return;
    
    setIsLoading(true);
    try {
      // Fetch all active stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, address, is_active')
        .eq('is_active', true)
        .order('name');

      if (storesError) throw storesError;

      // Check which stores already have this recipe deployed
      const { data: existingRecipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, store_id')
        .eq('name', template.name)
        .eq('is_active', true);

      if (recipesError) throw recipesError;

      // Create a map of deployed stores
      const deployedStoreMap = new Map(
        existingRecipes?.map(recipe => [recipe.store_id, recipe.id]) || []
      );

      // Combine store data with deployment status
      const storesWithStatus: StoreWithDeploymentStatus[] = (storesData || []).map(store => ({
        ...store,
        isAlreadyDeployed: deployedStoreMap.has(store.id),
        existingRecipeId: deployedStoreMap.get(store.id)
      }));

      setStores(storesWithStatus);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreSelection = (storeId: string, checked: boolean) => {
    if (checked) {
      setSelectedStoreIds(prev => [...prev, storeId]);
    } else {
      setSelectedStoreIds(prev => prev.filter(id => id !== storeId));
    }
  };

  const handleSelectAll = () => {
    const availableStores = stores.filter(store => !store.isAlreadyDeployed);
    if (selectedStoreIds.length === availableStores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(availableStores.map(store => store.id));
    }
  };

  const deployToStore = async (storeId: string) => {
    if (!template) return false;

    try {
      // Create product first (placeholder)
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: template.name,
          description: template.description,
          sku: `RCP-${template.name.replace(/\s+/g, '-').toUpperCase()}-${storeId.slice(0, 8)}`,
          price: 0, // Will be calculated
          cost: 0,  // Will be calculated
          stock_quantity: 0,
          store_id: storeId,
          is_active: false, // Keep inactive until approved
          image_url: template.image_url || null
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: template.name,
          description: template.description,
          instructions: template.instructions,
          yield_quantity: template.yield_quantity,
          serving_size: template.serving_size,
          store_id: storeId,
          product_id: product.id,
          category_name: template.category_name,
          is_active: true,
          approval_status: 'pending_approval',
          version: 1
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Create recipe ingredients
      const ingredientInserts = [];
      for (const ingredient of template.ingredients) {
        // Find or create inventory stock item for this store
        let { data: inventoryItem, error: inventoryFindError } = await supabase
          .from('inventory_stock')
          .select('id')
          .eq('store_id', storeId)
          .eq('item', ingredient.commissary_item_name)
          .maybeSingle();

        if (!inventoryItem) {
          // Create inventory stock item
          const { data: newInventoryItem, error: inventoryCreateError } = await supabase
            .from('inventory_stock')
            .insert({
              store_id: storeId,
              item: ingredient.commissary_item_name,
              unit: ingredient.unit,
              stock_quantity: 0,
              cost: ingredient.cost_per_unit || 0,
              is_active: true
            })
            .select()
            .single();

          if (inventoryCreateError) throw inventoryCreateError;
          inventoryItem = newInventoryItem;
        }

        ingredientInserts.push({
          recipe_id: recipe.id,
          inventory_stock_id: inventoryItem.id,
          commissary_item_id: ingredient.commissary_item_id,
          quantity: ingredient.quantity,
          unit: ingredient.unit as any,
          cost_per_unit: ingredient.cost_per_unit || 0
        });
      }

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientInserts);

      if (ingredientsError) throw ingredientsError;

      return true;
    } catch (error) {
      console.error(`Error deploying to store ${storeId}:`, error);
      return false;
    }
  };

  const handleDeploy = async () => {
    if (!template || selectedStoreIds.length === 0) {
      toast.error('Please select at least one store');
      return;
    }

    setIsDeploying(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const storeId of selectedStoreIds) {
        const success = await deployToStore(storeId);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Recipe deployed to ${successCount} store${successCount !== 1 ? 's' : ''} (pending approval)`);
        onSuccess();
        onClose();
      }

      if (failCount > 0) {
        toast.error(`Failed to deploy to ${failCount} store${failCount !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error deploying recipe:', error);
      toast.error('Failed to deploy recipe');
    } finally {
      setIsDeploying(false);
    }
  };

  if (!template) return null;

  const availableStores = stores.filter(store => !store.isAlreadyDeployed);
  const deployedStores = stores.filter(store => store.isAlreadyDeployed);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deploy Recipe: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Select the stores where you want to deploy this recipe template. The recipe will be created 
              with "pending approval" status and will need to be approved by store managers before 
              it becomes available as a product.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Available Stores</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isLoading || availableStores.length === 0}
              >
                {selectedStoreIds.length === availableStores.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading stores...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {availableStores.length > 0 && (
                  <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-3">
                    {availableStores.map(store => (
                      <div key={store.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={selectedStoreIds.includes(store.id)}
                          onCheckedChange={(checked) => handleStoreSelection(store.id, !!checked)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label 
                            htmlFor={`store-${store.id}`} 
                            className="cursor-pointer text-sm font-medium"
                          >
                            {store.name}
                          </Label>
                          <p className="text-xs text-muted-foreground truncate">
                            {store.address}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {deployedStores.length > 0 && (
                  <div>
                    <Label className="text-base font-medium text-muted-foreground mb-2 block">
                      Already Deployed ({deployedStores.length})
                    </Label>
                    <div className="border rounded-md p-4 bg-gray-50 space-y-2">
                      {deployedStores.map(store => (
                        <div key={store.id} className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0"></div>
                          <div className="flex-1">
                            <span className="font-medium">{store.name}</span>
                            <span className="ml-2 text-xs">- Recipe already deployed</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {availableStores.length === 0 && deployedStores.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No stores found
                  </p>
                )}
              </div>
            )}

            {selectedStoreIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedStoreIds.length} store{selectedStoreIds.length !== 1 ? 's' : ''} selected for deployment
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeploy} 
              disabled={selectedStoreIds.length === 0 || isDeploying}
            >
              {isDeploying ? 'Deploying...' : `Deploy to ${selectedStoreIds.length} Store${selectedStoreIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
