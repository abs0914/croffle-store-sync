import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/format';
import { Store, Settings } from 'lucide-react';

interface RecipeDeploymentEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: any | null;
  onSuccess: () => void;
}

interface StoreDeployment {
  id: string;
  name: string;
  address: string;
  isDeployed: boolean;
  productId?: string;
  price?: number;
}

export const RecipeDeploymentEditDialog: React.FC<RecipeDeploymentEditDialogProps> = ({
  isOpen,
  onClose,
  recipe,
  onSuccess
}) => {
  const [stores, setStores] = useState<StoreDeployment[]>([]);
  const [basePrice, setBasePrice] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && recipe) {
      loadDeploymentData();
    }
  }, [isOpen, recipe]);

  const loadDeploymentData = async () => {
    if (!recipe) return;

    setIsLoading(true);
    try {
      // Fetch all active stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, address, is_active')
        .eq('is_active', true)
        .order('name');

      if (storesError) throw storesError;

      // Check which stores have this recipe template deployed
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('id, store_id, product_id, total_cost')
        .eq('template_id', recipe.id);

      if (recipesError) throw recipesError;

      // Create deployment status map
      const deploymentMap = new Map(
        recipesData?.map(recipe => [recipe.store_id, { 
          recipeId: recipe.id, 
          productId: recipe.product_id,
          cost: recipe.total_cost || 0
        }]) || []
      );

      // Combine store and deployment data
      const storesWithDeployment: StoreDeployment[] = (storesData || []).map(store => ({
        ...store,
        isDeployed: deploymentMap.has(store.id),
        productId: deploymentMap.get(store.id)?.productId,
        price: deploymentMap.get(store.id)?.cost || 0
      }));

      setStores(storesWithDeployment);

      // Set initial pricing based on existing deployment or template cost (no markup)
      const existingCost = recipesData?.[0]?.total_cost;
      if (existingCost) {
        setBasePrice(existingCost);
      } else {
        // Calculate cost from template ingredients without markup
        const totalCost = recipe.ingredients?.reduce((sum: number, ingredient: any) => 
          sum + ((ingredient.quantity || 0) * (ingredient.cost_per_unit || 0)), 0
        ) || 0;
        setBasePrice(totalCost);
      }
    } catch (error) {
      console.error('Error loading deployment data:', error);
      toast.error('Failed to load deployment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreToggle = (storeId: string, isDeployed: boolean) => {
    setStores(prev => prev.map(store => 
      store.id === storeId 
        ? { ...store, isDeployed }
        : store
    ));
  };

  const handlePriceChange = (storeId: string, price: number) => {
    setStores(prev => prev.map(store => 
      store.id === storeId 
        ? { ...store, price }
        : store
    ));
  };

  const handleSave = async () => {
    if (!recipe) return;

    setIsSaving(true);
    try {
      const deployedStores = stores.filter(store => store.isDeployed);
      const undeployedStores = stores.filter(store => !store.isDeployed && store.productId);

      // Remove from undeployed stores
      for (const store of undeployedStores) {
        if (store.productId) {
          const { error } = await supabase
            .from('product_catalog')
            .delete()
            .eq('id', store.productId);
          
          if (error) throw error;
        }
      }

      // Add/update deployed stores
      for (const store of deployedStores) {
        if (store.productId) {
            // Update existing deployment price in product catalog
            if (store.productId) {
              const { error } = await supabase
                .from('product_catalog')
                .update({
                  price: store.price || basePrice,
                  updated_at: new Date().toISOString()
                })
                .eq('id', store.productId);
              
              if (error) throw error;
            }
        } else {
          // Create new deployment through the enhanced deployment service
          console.log(`Creating new deployment for store ${store.name}`);
          // Note: New deployments should be created through the deployment service
          // This edit dialog is primarily for managing existing deployments
        }
      }

      toast.success('Deployment settings updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating deployment:', error);
      toast.error('Failed to update deployment settings');
    } finally {
      setIsSaving(false);
    }
  };

  const applyPriceToAll = () => {
    setStores(prev => prev.map(store => ({
      ...store,
      price: basePrice
    })));
  };

  if (!recipe) return null;

  const deployedCount = stores.filter(store => store.isDeployed).length;
  const totalStores = stores.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Deployment: {recipe.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipe Template Info */}
          <div className="bg-muted/50 p-4 rounded-md">
            <h3 className="font-medium mb-2">Recipe Template Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p>{recipe.description || 'No description'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Ingredients:</span>
                <p>{recipe.ingredients?.length || 0} ingredients</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p>{recipe.category || 'No category'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Yield:</span>
                <p>{recipe.yield_quantity || 1} servings</p>
              </div>
            </div>
          </div>

          {/* Deployment Summary */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Store className="h-3 w-3" />
              {deployedCount} of {totalStores} stores
            </Badge>
            <span className="text-sm text-muted-foreground">
              Currently deployed to {deployedCount} store{deployedCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Global Pricing */}
          <div className="space-y-4">
            <h3 className="font-medium">Pricing Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basePrice">Base Price (₱)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={applyPriceToAll}
                  className="w-full"
                >
                  Apply to All Stores
                </Button>
              </div>
            </div>
          </div>

          {/* Store Deployments */}
          <div className="space-y-4">
            <h3 className="font-medium">Store Deployments</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading stores...</p>
              </div>
            ) : (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <div className="space-y-0">
                  {stores.map(store => (
                    <div key={store.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={store.isDeployed}
                          onCheckedChange={(checked) => handleStoreToggle(store.id, !!checked)}
                        />
                        <div className="flex-1 min-w-0">
                          <Label 
                            htmlFor={`store-${store.id}`} 
                            className="cursor-pointer font-medium"
                          >
                            {store.name}
                          </Label>
                          <p className="text-xs text-muted-foreground truncate">
                            {store.address}
                          </p>
                        </div>
                      </div>
                      
                      {store.isDeployed && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`price-${store.id}`} className="text-sm">₱</Label>
                          <Input
                            id={`price-${store.id}`}
                            type="number"
                            step="0.01"
                            value={store.price || basePrice}
                            onChange={(e) => handlePriceChange(store.id, parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isLoading}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};