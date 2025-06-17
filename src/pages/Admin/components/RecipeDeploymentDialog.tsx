
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplate, deployRecipeToStores, getRecipeDeployments } from '@/services/recipeManagement/recipeTemplateService';

interface RecipeDeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: RecipeTemplate | null;
  onSuccess: () => void;
}

interface StoreWithStatus {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  deployment_status?: 'deployed' | 'failed' | 'pending' | null;
  deployed_at?: string;
  error_message?: string;
}

export const RecipeDeploymentDialog: React.FC<RecipeDeploymentDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess
}) => {
  const [stores, setStores] = useState<StoreWithStatus[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && template) {
      fetchStoresWithDeploymentStatus();
    }
  }, [isOpen, template]);

  const fetchStoresWithDeploymentStatus = async () => {
    if (!template) return;
    
    setIsLoading(true);
    try {
      // Fetch all active stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (storesError) throw storesError;

      // Fetch deployment status for this template
      const deployments = await getRecipeDeployments();
      const templateDeployments = deployments.filter(d => 
        d.recipe && d.recipe.name === template.name
      );

      const storesWithStatus: StoreWithStatus[] = (storesData || []).map(store => {
        const deployment = templateDeployments.find(d => d.store_id === store.id);
        return {
          ...store,
          deployment_status: deployment?.deployment_status || null,
          deployed_at: deployment?.deployed_at,
          error_message: deployment?.error_message
        };
      });

      setStores(storesWithStatus);
      setSelectedStores([]);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
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
    if (selectedStores.length === stores.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(stores.map(store => store.id));
    }
  };

  const handleDeploy = async () => {
    if (!template || selectedStores.length === 0) {
      toast.error('Please select at least one store');
      return;
    }

    setIsDeploying(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        toast.error('Authentication required');
        return;
      }

      await deployRecipeToStores(template.id, selectedStores, user.data.user.id);
      
      // Refresh deployment status
      await fetchStoresWithDeploymentStatus();
      onSuccess();
    } catch (error) {
      console.error('Error deploying recipe:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  const getStatusIcon = (status?: string | null) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Store className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'deployed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Deployed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Not Deployed</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Deploy Recipe: {template?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedStores.length === stores.length && stores.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All Stores ({stores.length})
              </label>
            </div>
            
            <Badge variant="outline">
              {selectedStores.length} selected
            </Badge>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading stores...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stores.map(store => (
                <Card key={store.id} className="cursor-pointer hover:bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedStores.includes(store.id)}
                          onCheckedChange={() => handleStoreToggle(store.id)}
                        />
                        
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(store.deployment_status)}
                          <div>
                            <p className="font-medium">{store.name}</p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {store.address}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        {getStatusBadge(store.deployment_status)}
                        {store.deployed_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(store.deployed_at).toLocaleString()}
                          </p>
                        )}
                        {store.error_message && (
                          <p className="text-xs text-red-500 mt-1 max-w-48 truncate">
                            {store.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeploy} 
              disabled={selectedStores.length === 0 || isDeploying}
            >
              {isDeploying ? 'Deploying...' : `Deploy to ${selectedStores.length} Store${selectedStores.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
