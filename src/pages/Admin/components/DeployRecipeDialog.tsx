
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  Store, 
  AlertCircle, 
  CheckCircle,
  Users,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplate } from '@/services/recipeManagement/types';
import { 
  deployRecipeToProductCatalog,
  deployRecipeToMultipleStores 
} from '@/services/recipeManagement/recipeDeploymentService';

interface DeployRecipeDialogProps {
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

export const DeployRecipeDialog: React.FC<DeployRecipeDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchStores();
    }
  }, [isOpen]);

  const fetchStores = async () => {
    setLoadingStores(true);
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
      setLoadingStores(false);
    }
  };

  const handleStoreToggle = (storeId: string) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAll = () => {
    setSelectedStores(
      selectedStores.length === stores.length 
        ? [] 
        : stores.map(store => store.id)
    );
  };

  const handleDeploy = async () => {
    if (!template || selectedStores.length === 0) {
      toast.error('Please select at least one store');
      return;
    }

    setIsDeploying(true);
    try {
      const results = await deployRecipeToMultipleStores(template, selectedStores);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast.success(`Successfully deployed to ${successCount} store${successCount !== 1 ? 's' : ''}`);
      }
      
      if (failCount > 0) {
        toast.warning(`Failed to deploy to ${failCount} store${failCount !== 1 ? 's' : ''}`);
      }

      if (successCount > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error deploying recipe:', error);
      toast.error('Failed to deploy recipe template');
    } finally {
      setIsDeploying(false);
    }
  };

  if (!template) return null;

  const totalCost = template.ingredients.reduce((sum, ingredient) => 
    sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deploy Recipe Template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              {template.description && (
                <CardDescription>{template.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Yield: {template.yield_quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Serving: {template.serving_size || 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-medium">₱{totalCost.toFixed(2)}</span>
                </div>
              </div>
              
              {template.category_name && (
                <div className="mt-3">
                  <Badge variant="outline">{template.category_name}</Badge>
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {template.ingredients.length} ingredient{template.ingredients.length !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Store Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Select Stores for Deployment
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={loadingStores}
                >
                  {selectedStores.length === stores.length ? 'Deselect All' : 'Select All'}
                </Button>
              </CardTitle>
              <CardDescription>
                Choose which stores should receive this recipe template
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStores ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : stores.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No active stores found. Please ensure there are active stores to deploy to.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {stores.map(store => (
                    <div key={store.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                      <Checkbox
                        checked={selectedStores.includes(store.id)}
                        onCheckedChange={() => handleStoreToggle(store.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{store.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {store.address}
                        </p>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deployment Info */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">What happens during deployment:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Recipe will be created in selected stores' inventory systems</li>
                  <li>• Recipe ingredients will be linked to store inventory items</li>
                  <li>• Recipe will be available for POS usage and product creation</li>
                  <li>• Store managers can modify quantities as needed</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose} disabled={isDeploying}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeploy} 
              disabled={selectedStores.length === 0 || isDeploying}
              className="min-w-32"
            >
              {isDeploying ? (
                <>Deploying...</>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy to {selectedStores.length} Store{selectedStores.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
