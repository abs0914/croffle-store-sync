import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Store, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader, 
  DollarSign,
  Package,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  deployRecipeToMultipleStores, 
  DeploymentResult,
  DeploymentOptions 
} from '@/services/recipeManagement/recipeDeploymentService';

interface RecipeDeploymentManagerProps {
  template: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface StoreInfo {
  id: string;
  name: string;
  location_type: string;
  isSelected: boolean;
  hasExistingRecipe: boolean;
}

export const RecipeDeploymentManager: React.FC<RecipeDeploymentManagerProps> = ({
  template,
  onClose,
  onSuccess
}) => {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [deploymentOptions, setDeploymentOptions] = useState<DeploymentOptions>({
    priceMarkup: 0.5, // 50% default markup
    isActive: true
  });
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentResults, setDeploymentResults] = useState<DeploymentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoresAndExistingRecipes();
  }, [template]);

  const loadStoresAndExistingRecipes = async () => {
    try {
      setIsLoading(true);

      // Get all stores
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, location_type')
        .eq('is_active', true)
        .order('name');

      if (storesError) throw storesError;

      // Check for existing recipes with the same name
      const { data: existingRecipes, error: recipesError } = await supabase
        .from('recipes')
        .select('store_id')
        .eq('name', template.name);

      if (recipesError) throw recipesError;

      const existingStoreIds = new Set(existingRecipes?.map(r => r.store_id) || []);

      const enrichedStores: StoreInfo[] = storesData?.map(store => ({
        id: store.id,
        name: store.name,
        location_type: store.location_type || 'unknown',
        isSelected: false,
        hasExistingRecipe: existingStoreIds.has(store.id)
      })) || [];

      setStores(enrichedStores);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load store information');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStoreSelection = (storeId: string) => {
    setStores(prev => prev.map(store => 
      store.id === storeId 
        ? { ...store, isSelected: !store.isSelected }
        : store
    ));
  };

  const selectAllStores = () => {
    setStores(prev => prev.map(store => ({ ...store, isSelected: true })));
  };

  const deselectAllStores = () => {
    setStores(prev => prev.map(store => ({ ...store, isSelected: false })));
  };

  const calculatePricing = () => {
    const totalCost = template.ingredients?.reduce((sum: number, ing: any) => {
      return sum + (ing.quantity * (ing.cost_per_unit || 0));
    }, 0) || 0;
    
    const costPerServing = template.yield_quantity > 0 ? totalCost / template.yield_quantity : 0;
    const suggestedPrice = costPerServing * (1 + (deploymentOptions.priceMarkup || 0));
    
    return { totalCost, costPerServing, suggestedPrice };
  };

  const handleDeploy = async () => {
    const selectedStores = stores.filter(store => store.isSelected);
    
    if (selectedStores.length === 0) {
      toast.error('Please select at least one store for deployment');
      return;
    }

    setIsDeploying(true);
    setDeploymentProgress(0);
    setDeploymentResults([]);

    try {
      const selectedStoreIds = selectedStores.map(store => store.id);
      
      // Deploy to all selected stores
      const results = await deployRecipeToMultipleStores(
        template.id, 
        selectedStoreIds, 
        deploymentOptions
      );

      setDeploymentResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount === totalCount) {
        toast.success(`Recipe successfully deployed to all ${totalCount} stores`);
        onSuccess();
      } else if (successCount > 0) {
        toast.warning(`Recipe deployed to ${successCount} of ${totalCount} stores`);
      } else {
        toast.error('Failed to deploy recipe to any stores');
      }

      setDeploymentProgress(100);
    } catch (error) {
      console.error('Deployment error:', error);
      toast.error('Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const pricing = calculatePricing();
  const selectedStoresCount = stores.filter(store => store.isSelected).length;
  const storesWithExistingRecipes = stores.filter(store => store.isSelected && store.hasExistingRecipe);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Deploying: {template.name}
          </CardTitle>
          <CardDescription>
            Deploy this recipe template to selected stores with automatic inventory mapping
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Yield:</span>
              <div className="font-medium">{template.yield_quantity} servings</div>
            </div>
            <div>
              <span className="text-muted-foreground">Ingredients:</span>
              <div className="font-medium">{template.ingredients?.length || 0} items</div>
            </div>
            <div>
              <span className="text-muted-foreground">Cost per serving:</span>
              <div className="font-medium">₱{pricing.costPerServing.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Suggested price:</span>
              <div className="font-medium">₱{pricing.suggestedPrice.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Deployment Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priceMarkup">Price Markup (%)</Label>
              <Input
                id="priceMarkup"
                type="number"
                min="0"
                max="200"
                step="5"
                value={(deploymentOptions.priceMarkup || 0) * 100}
                onChange={(e) => setDeploymentOptions(prev => ({
                  ...prev,
                  priceMarkup: Number(e.target.value) / 100
                }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="customName">Custom Recipe Name (optional)</Label>
              <Input
                id="customName"
                placeholder={template.name}
                value={deploymentOptions.customName || ''}
                onChange={(e) => setDeploymentOptions(prev => ({
                  ...prev,
                  customName: e.target.value
                }))}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={deploymentOptions.isActive !== false}
              onCheckedChange={(checked) => setDeploymentOptions(prev => ({
                ...prev,
                isActive: checked as boolean
              }))}
            />
            <Label htmlFor="isActive">Deploy as active recipe</Label>
          </div>
        </CardContent>
      </Card>

      {/* Store Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Select Target Stores ({selectedStoresCount} selected)
              </CardTitle>
              <CardDescription>
                Choose which stores to deploy this recipe to
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllStores}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllStores}>
                Deselect All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {storesWithExistingRecipes.length > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {storesWithExistingRecipes.length} selected stores already have a recipe with this name. 
                Deployment will update the existing recipes.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {stores.map(store => (
              <div
                key={store.id}
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  store.isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleStoreSelection(store.id)}
              >
                <Checkbox
                  checked={store.isSelected}
                  onChange={() => {}}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{store.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {store.location_type}
                    {store.hasExistingRecipe && (
                      <Badge variant="secondary" className="ml-2">
                        Has Recipe
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Progress */}
      {isDeploying && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={deploymentProgress} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Deploying to {selectedStoresCount} stores...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deployment Results */}
      {deploymentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deploymentResults.map(result => (
                <div
                  key={result.storeId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    result.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{result.storeName}</div>
                    {result.error && (
                      <div className="text-sm text-red-600">{result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onClose}>
          {deploymentResults.length > 0 ? 'Close' : 'Cancel'}
        </Button>
        <Button 
          onClick={handleDeploy} 
          disabled={isDeploying || selectedStoresCount === 0}
          className="min-w-32"
        >
          {isDeploying ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              Deploy Recipe
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};