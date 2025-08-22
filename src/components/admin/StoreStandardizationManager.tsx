import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Loader2, Store, Package } from 'lucide-react';
import { toast } from 'sonner';
import { 
  deployMissingTemplatesToStores,
  standardizeProductCatalogs,
  getStoresStatus,
  type StoreStatus,
  type DeploymentResult 
} from '@/services/storeStandardization/targetedDeploymentService';

export const StoreStandardizationManager: React.FC = () => {
  const [storesStatus, setStoresStatus] = useState<StoreStatus[]>([]);
  const [deploymentResults, setDeploymentResults] = useState<DeploymentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadStoresStatus();
  }, []);

  const loadStoresStatus = async () => {
    try {
      setIsLoading(true);
      const status = await getStoresStatus();
      setStoresStatus(status);
    } catch (error) {
      console.error('Error loading stores status:', error);
      toast.error('Failed to load stores status');
    } finally {
      setIsLoading(false);
    }
  };

  const executeStandardizationPlan = async () => {
    setIsDeploying(true);
    setProgress(0);
    setDeploymentResults([]);

    try {
      // Phase 1: Deploy Missing Recipe Templates
      setCurrentPhase('Phase 1: Deploying missing recipe templates...');
      setProgress(20);
      
      const deployResults = await deployMissingTemplatesToStores();
      setDeploymentResults(deployResults);

      const successfulDeployments = deployResults.filter(r => r.success);
      const failedDeployments = deployResults.filter(r => !r.success);

      if (successfulDeployments.length > 0) {
        toast.success(`Successfully deployed templates to ${successfulDeployments.length} stores`);
      }

      if (failedDeployments.length > 0) {
        toast.error(`Failed to deploy templates to ${failedDeployments.length} stores`);
      }

      setProgress(50);

      // Phase 2: Standardize Product Catalogs
      setCurrentPhase('Phase 2: Standardizing product catalogs...');
      
      await standardizeProductCatalogs();
      toast.success('Product catalogs standardized successfully');

      setProgress(80);

      // Phase 3: Refresh status
      setCurrentPhase('Phase 3: Validating results...');
      await loadStoresStatus();
      
      setProgress(100);
      setCurrentPhase('Standardization complete!');

      toast.success('Store standardization completed successfully!');

    } catch (error) {
      console.error('Error during standardization:', error);
      toast.error('Standardization failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDeploying(false);
      setTimeout(() => {
        setCurrentPhase('');
        setProgress(0);
      }, 3000);
    }
  };

  const getStatusBadge = (missing: number) => {
    if (missing === 0) return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
    if (missing <= 5) return <Badge variant="secondary">Nearly Complete</Badge>;
    return <Badge variant="destructive">Needs Work</Badge>;
  };

  const totalStoresNeedingWork = storesStatus.filter(s => s.missingTemplates > 0).length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading stores status...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Standardization Manager
          </CardTitle>
          <CardDescription>
            Standardize all stores to match Sugbo Mercado's operational status (excluding Sugbo Mercado from changes)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overview Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Protected Store:</strong> Sugbo Mercado (IT Park, Cebu) will not be affected by this standardization.
              {totalStoresNeedingWork > 0 && (
                <span className="block mt-1">
                  {totalStoresNeedingWork} stores need template deployment to reach full operational status.
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Progress Indicator */}
          {isDeploying && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{currentPhase}</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Action Button */}
          <div className="flex gap-2">
            <Button 
              onClick={executeStandardizationPlan}
              disabled={isDeploying || totalStoresNeedingWork === 0}
              className="flex items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Standardizing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Execute Standardization Plan
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={loadStoresStatus} disabled={isDeploying}>
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stores Status */}
      <Card>
        <CardHeader>
          <CardTitle>Stores Status</CardTitle>
          <CardDescription>
            Current operational status of all stores (Target: 64 recipe templates, 60+ products)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {storesStatus.map((store) => (
              <div key={store.storeId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{store.storeName}</h4>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>Products: {store.productCount}</span>
                    <span>Recipes: {store.recipeCount}</span>
                    <span>Templates: {store.deployedTemplates}/64</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(store.missingTemplates)}
                  {store.missingTemplates > 0 && (
                    <span className="text-sm text-orange-600">
                      Missing {store.missingTemplates} templates
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Deployment Results */}
      {deploymentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Deployment Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deploymentResults.map((result) => (
                <div key={result.storeId} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      {result.storeName}
                    </h4>
                    {result.success ? (
                      <p className="text-sm text-muted-foreground">
                        Deployed {result.deployedRecipes} recipes, {result.deployedProducts} products
                      </p>
                    ) : (
                      <div className="text-sm text-red-600">
                        {result.errors.map((error, idx) => (
                          <div key={idx}>{error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};