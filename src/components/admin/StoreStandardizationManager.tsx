import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, Loader2, Store, Package, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { 
  deployMissingTemplatesToStores,
  standardizeProductCatalogs,
  getStoresStatus,
  type StoreStatus,
  type DeploymentResult 
} from '@/services/storeStandardization/targetedDeploymentService';
import { Phase2CatalogStandardization } from './Phase2CatalogStandardization';
import { Phase3DataValidation } from './Phase3DataValidation';
import { Phase4StoreConfiguration } from './Phase4StoreConfiguration';

export const StoreStandardizationManager: React.FC = () => {
  const [storesStatus, setStoresStatus] = useState<StoreStatus[]>([]);
  const [deploymentResults, setDeploymentResults] = useState<DeploymentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('phase1');

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
            Multi-phase standardization to bring all stores to Sugbo Mercado's operational level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overview Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Protected Store:</strong> Sugbo Mercado (IT Park, Cebu) will not be affected by standardization.
              <br />
              <strong>Current Status:</strong> {totalStoresNeedingWork} stores need template deployment to reach operational status.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="phase1">Phase 1: Templates</TabsTrigger>
          <TabsTrigger value="phase2">Phase 2: Catalogs</TabsTrigger>
          <TabsTrigger value="phase3">Phase 3: Validation</TabsTrigger>
          <TabsTrigger value="phase4">Phase 4: Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="phase1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Phase 1: Recipe Template Deployment
              </CardTitle>
              <CardDescription>
                Deploy missing recipe templates to all stores to establish base functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      Deploying Templates...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4" />
                      Execute Phase 1
                    </>
                  )}
                </Button>
                
                <Button variant="outline" onClick={loadStoresStatus} disabled={isDeploying}>
                  Refresh Status
                </Button>
              </div>

              {/* Stores Status */}
              <div className="space-y-4">
                <h4 className="font-medium">Stores Template Status</h4>
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
              </div>

              {/* Phase 1 Deployment Results */}
              {deploymentResults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Latest Phase 1 Results</h4>
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
                              {result.errors.slice(0, 2).map((error, idx) => (
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
                </div>
              )}

              {/* Phase 1 Complete - Next Phase CTA */}
              {deploymentResults.length > 0 && deploymentResults.every(r => r.success) && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Phase 1 completed successfully! Ready for Phase 2.</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-4"
                      onClick={() => setActiveTab('phase2')}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Go to Phase 2
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phase2">
          <Phase2CatalogStandardization />
        </TabsContent>

        <TabsContent value="phase3">
          <Phase3DataValidation />
        </TabsContent>

        <TabsContent value="phase4">
          <Phase4StoreConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
};