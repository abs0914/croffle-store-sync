import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RecipeTemplate } from '@/services/recipeManagement/types';
import { 
  OptimizedBatchDeploymentService, 
  BatchDeploymentProgress 
} from '@/services/recipeManagement/optimizedBatchDeploymentService';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Package, 
  Loader2, 
  Clock,
  TrendingUp
} from 'lucide-react';

interface OptimizedRecipeDeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: RecipeTemplate | null;
  onSuccess: () => void;
}

interface Store {
  id: string;
  name: string;
}

export const OptimizedRecipeDeploymentDialog: React.FC<OptimizedRecipeDeploymentDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSuccess,
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [price, setPrice] = useState<number>(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<BatchDeploymentProgress[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);

  useEffect(() => {
    if (isOpen && template) {
      loadStores();
      setPrice(template.suggested_price || 0);
      setDeploymentProgress([]);
      setShowResults(false);
      setStartTime(null);
    }
  }, [isOpen, template]);

  useEffect(() => {
    if (selectedStores.size > 0) {
      // Estimate deployment time: 2-3 seconds per store for optimized deployment
      const estimatedSeconds = selectedStores.size * 2.5;
      setEstimatedTime(estimatedSeconds);
    }
  }, [selectedStores.size]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const handleStoreToggle = (storeId: string) => {
    const newSelectedStores = new Set(selectedStores);
    if (newSelectedStores.has(storeId)) {
      newSelectedStores.delete(storeId);
    } else {
      newSelectedStores.add(storeId);
    }
    setSelectedStores(newSelectedStores);
  };

  const handleSelectAll = () => {
    if (selectedStores.size === stores.length) {
      setSelectedStores(new Set());
    } else {
      setSelectedStores(new Set(stores.map(store => store.id)));
    }
  };

  const handleDeploy = async () => {
    if (!template || selectedStores.size === 0) {
      toast.error('Please select at least one store');
      return;
    }

    if (price <= 0) {
      toast.error('Please set a valid price greater than 0');
      return;
    }

    setIsDeploying(true);
    setStartTime(new Date());
    setShowResults(false);
    
    try {
      console.log('🚀 Starting optimized deployment with price:', price);
      
      const selectedStoreIds = Array.from(selectedStores);
      
      // Deploy with optimized service
      const results = await OptimizedBatchDeploymentService.deployRecipeToMultipleStoresOptimized(
        template.id,
        selectedStoreIds,
        {
          actualPrice: price,
          createProduct: true,
          isActive: true,
          batchSize: 3, // Process 3 stores at a time
          onProgress: (progress) => {
            setDeploymentProgress([...progress]);
          }
        }
      );
      
      setShowResults(true);
      
      // Clear inventory cache after deployment
      OptimizedBatchDeploymentService.clearInventoryCache();
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (successCount === results.length) {
        toast.success(`Successfully deployed to all ${successCount} stores! 🎉`);
      } else if (successCount > 0) {
        toast.warning(`Deployed to ${successCount} stores, ${failureCount} failed`);
      } else {
        toast.error('All deployments failed');
      }
      
      if (successCount > 0) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Deployment failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDeploying(false);
    }
  };

  const getElapsedTime = (): string => {
    if (!startTime) return '';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    return `${elapsed}s`;
  };

  const getOverallProgress = (): number => {
    if (deploymentProgress.length === 0) return 0;
    const totalProgress = deploymentProgress.reduce((sum, item) => sum + item.progress, 0);
    return Math.round(totalProgress / deploymentProgress.length);
  };

  const handleReset = () => {
    setDeploymentProgress([]);
    setShowResults(false);
    setIsDeploying(false);
    setStartTime(null);
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Deploy Recipe: {template.name}
            {isDeploying && (
              <Badge variant="secondary" className="ml-2">
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Deploying...
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            {/* Price Configuration */}
            <div className="space-y-2">
              <Label htmlFor="price">Recipe Price (₱)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                placeholder="Enter price per serving"
                disabled={isDeploying}
              />
              {template.suggested_price && (
                <p className="text-sm text-muted-foreground">
                  Suggested price: ₱{template.suggested_price.toFixed(2)}
                </p>
              )}
            </div>

            {/* Store Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select Stores ({selectedStores.size} of {stores.length})</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isDeploying}
                >
                  {selectedStores.size === stores.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                {stores.map((store) => (
                  <div key={store.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`store-${store.id}`}
                      checked={selectedStores.has(store.id)}
                      onCheckedChange={() => handleStoreToggle(store.id)}
                      disabled={isDeploying}
                    />
                    <label
                      htmlFor={`store-${store.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {store.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Deployment Info */}
            {selectedStores.size > 0 && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p>Ready to deploy to {selectedStores.size} store{selectedStores.size > 1 ? 's' : ''}</p>
                    <p className="text-sm text-muted-foreground">
                      Estimated time: ~{Math.round(estimatedTime)}s (optimized parallel processing)
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Deploy Button */}
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outline" disabled={isDeploying}>
                Cancel
              </Button>
              <Button 
                onClick={handleDeploy} 
                disabled={selectedStores.size === 0 || price <= 0 || isDeploying}
                className="flex-1"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deploying... ({getElapsedTime()})
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Deploy to {selectedStores.size} Store{selectedStores.size > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {/* Progress Section */}
        {isDeploying && deploymentProgress.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Overall Progress</Label>
                <span className="text-sm text-muted-foreground">
                  {getOverallProgress()}% • {getElapsedTime()}
                </span>
              </div>
              <Progress value={getOverallProgress()} className="w-full" />
            </div>

            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {deploymentProgress.map((item) => (
                <div key={item.storeId} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {item.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {item.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                    {['pending', 'processing', 'validating', 'deploying'].includes(item.status) && (
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.storeName}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {item.status.replace('_', ' ')}
                    </p>
                    {item.error && (
                      <p className="text-sm text-red-600 truncate">{item.error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 w-16 text-right">
                    <span className="text-sm font-medium">{item.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {showResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Deployment Results</Label>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Deploy Again
              </Button>
            </div>

            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {deploymentProgress.map((item) => (
                <div key={item.storeId} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {item.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {item.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.storeName}</p>
                    {item.status === 'success' && (
                      <p className="text-sm text-green-600">
                        Recipe deployed successfully
                        {item.productId && ' • Product created'}
                      </p>
                    )}
                    {item.error && (
                      <p className="text-sm text-red-600">{item.error}</p>
                    )}
                    {item.warnings && item.warnings.length > 0 && (
                      <p className="text-sm text-yellow-600">
                        {item.warnings.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Badge variant={item.status === 'success' ? 'default' : 'destructive'}>
                      {item.status === 'success' ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={onClose} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};