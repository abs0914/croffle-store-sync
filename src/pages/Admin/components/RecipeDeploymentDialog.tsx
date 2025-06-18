
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplate } from '@/services/recipeManagement/types';
import { deployRecipeToMultipleStores } from '@/services/recipeManagement/recipeDeploymentService';

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
  existingProductId?: string;
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
  const [pricing, setPricing] = useState({
    price: 0,
    markup: 1.5
  });

  useEffect(() => {
    if (isOpen && template) {
      fetchStoresWithDeploymentStatus();
      setSelectedStoreIds([]);
      
      // Calculate suggested price based on ingredients
      const totalCost = template.ingredients.reduce((sum, ingredient) => 
        sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
      );
      setPricing({
        price: totalCost * 1.5, // Default 50% markup
        markup: 1.5
      });
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

      // Check which stores already have this recipe deployed in product catalog
      const { data: existingProducts, error: productsError } = await supabase
        .from('product_catalog')
        .select('id, store_id')
        .eq('product_name', template.name);

      if (productsError) throw productsError;

      // Create a map of deployed stores
      const deployedStoreMap = new Map(
        existingProducts?.map(product => [product.store_id, product.id]) || []
      );

      // Combine store data with deployment status
      const storesWithStatus: StoreWithDeploymentStatus[] = (storesData || []).map(store => ({
        ...store,
        isAlreadyDeployed: deployedStoreMap.has(store.id),
        existingProductId: deployedStoreMap.get(store.id)
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

  const handleDeploy = async () => {
    if (!template || selectedStoreIds.length === 0) {
      toast.error('Please select at least one store');
      return;
    }

    setIsDeploying(true);
    try {
      await deployRecipeToMultipleStores(template, selectedStoreIds);
      onSuccess();
      onClose();
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
          <DialogTitle>Deploy Recipe to Product Catalog: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Deploy this recipe template to store product catalogs. Products will be created 
              with "pending approval" status and require store manager approval before becoming available.
            </p>
          </div>

          {/* Pricing Configuration */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Product Pricing</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Product Price (₱)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={pricing.price}
                  onChange={(e) => setPricing(prev => ({ 
                    ...prev, 
                    price: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="markup">Markup Multiplier</Label>
                <Input
                  id="markup"
                  type="number"
                  step="0.1"
                  value={pricing.markup}
                  onChange={(e) => {
                    const markup = parseFloat(e.target.value) || 1;
                    const totalCost = template.ingredients.reduce((sum, ingredient) => 
                      sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
                    );
                    setPricing({ 
                      markup, 
                      price: totalCost * markup 
                    });
                  }}
                />
              </div>
            </div>
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
                            <span className="ml-2 text-xs">- Product already in catalog</span>
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
