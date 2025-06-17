
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplate } from '@/services/recipeManagement/recipeTemplateService';
import { deployRecipeToStores } from '@/services/recipeManagement/recipeDeploymentService';

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

export const RecipeDeploymentDialog: React.FC<RecipeDeploymentDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStores();
      setSelectedStoreIds([]);
    }
  }, [isOpen]);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, address, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
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
    if (selectedStoreIds.length === stores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(stores.map(store => store.id));
    }
  };

  const handleDeploy = async () => {
    if (!template || selectedStoreIds.length === 0) {
      toast.error('Please select at least one store');
      return;
    }

    setIsDeploying(true);
    try {
      const results = await deployRecipeToStores(template.id, selectedStoreIds);
      
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error deploying recipe:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deploy Recipe: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Select the stores where you want to deploy this recipe. The recipe will be created 
              with "pending approval" status and will need to be approved by store managers before 
              it becomes available as a product.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Stores</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isLoading}
              >
                {selectedStoreIds.length === stores.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading stores...</p>
              </div>
            ) : (
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-3">
                {stores.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active stores found
                  </p>
                ) : (
                  stores.map(store => (
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
                  ))
                )}
              </div>
            )}

            {selectedStoreIds.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedStoreIds.length} store{selectedStoreIds.length !== 1 ? 's' : ''} selected
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
