import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import {
  getMultiStoreDeploymentPreview,
  deployRecipeToMultipleStoresEnhanced,
  type EnhancedDeploymentResult
} from '@/services/recipeManagement/enhancedRecipeDeploymentService';

interface RecipeDeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
  selectedStores: Array<{ id: string; name: string }>;
  onDeploymentComplete?: (results: EnhancedDeploymentResult[]) => void;
}

export function RecipeDeploymentDialog({
  isOpen,
  onClose,
  templateId,
  templateName,
  selectedStores,
  onDeploymentComplete
}: RecipeDeploymentDialogProps) {
  const [previews, setPreviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    if (isOpen && templateId && selectedStores.length > 0) {
      loadPreviews();
    }
  }, [isOpen, templateId, selectedStores]);

  const loadPreviews = async () => {
    setIsLoading(true);
    try {
      const storeIds = selectedStores.map(s => s.id);
      const previewData = await getMultiStoreDeploymentPreview(templateId, storeIds);
      setPreviews(previewData);
    } catch (error) {
      console.error('Error loading deployment previews:', error);
      toast.error('Failed to load deployment preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const storeIds = selectedStores.map(s => s.id);
      const results = await deployRecipeToMultipleStoresEnhanced(templateId, storeIds);
      
      onDeploymentComplete?.(results);
      onClose();
    } catch (error) {
      console.error('Error during deployment:', error);
      toast.error('Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const getValidationIcon = (canDeploy: boolean, hasWarnings: boolean) => {
    if (!canDeploy) return <XCircle className="h-4 w-4 text-destructive" />;
    if (hasWarnings) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getValidationStatus = (canDeploy: boolean, hasWarnings: boolean) => {
    if (!canDeploy) return 'Cannot Deploy';
    if (hasWarnings) return 'Deploy with Warnings';
    return 'Ready to Deploy';
  };

  const canDeployToAnyStore = previews.some(p => p.validation?.canDeploy);
  const totalEstimatedCost = previews.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  const totalEstimatedPrice = previews.reduce((sum, p) => sum + (p.estimatedPrice || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deploy Recipe: {templateName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading deployment preview...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="mapping">Ingredient Mapping</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Stores Selected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedStores.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Avg. Recipe Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₱{(totalEstimatedCost / selectedStores.length || 0).toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Avg. Selling Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₱{(totalEstimatedPrice / selectedStores.length || 0).toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                {previews.map((preview) => (
                  <Card key={preview.storeId}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{preview.storeName}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getValidationIcon(
                            preview.validation?.canDeploy,
                            preview.validation?.lowStockIngredients?.length > 0
                          )}
                          <Badge variant={preview.validation?.canDeploy ? 'default' : 'destructive'}>
                            {getValidationStatus(
                              preview.validation?.canDeploy,
                              preview.validation?.lowStockIngredients?.length > 0
                            )}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Recipe Cost: </span>
                          ₱{preview.estimatedCost?.toFixed(2) || '0.00'}
                        </div>
                        <div>
                          <span className="font-medium">Selling Price: </span>
                          ₱{preview.estimatedPrice?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      {preview.validation?.mappingIssues?.length > 0 && (
                        <Alert className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {preview.validation.mappingIssues.join('; ')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="validation" className="space-y-4">
              {previews.map((preview) => (
                <Card key={preview.storeId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {preview.storeName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {preview.validation?.missingIngredients?.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Missing Ingredients:</strong> {preview.validation.missingIngredients.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {preview.validation?.lowStockIngredients?.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Low Stock Ingredients:</strong> {preview.validation.lowStockIngredients.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {preview.validation?.canDeploy && 
                     preview.validation?.missingIngredients?.length === 0 && 
                     preview.validation?.lowStockIngredients?.length === 0 && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          All ingredients are available and ready for deployment.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="mapping" className="space-y-4">
              {previews.map((preview) => (
                <Card key={preview.storeId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {preview.storeName} - Ingredient Mapping
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {preview.mapping?.ingredient_mappings?.length > 0 ? (
                      <div className="space-y-2">
                        {preview.mapping.ingredient_mappings.map((mapping: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-medium">{mapping.template_ingredient_name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                → {mapping.store_inventory_item}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {mapping.quantity_per_serving} {mapping.unit}
                              </span>
                              <Badge 
                                variant={
                                  mapping.availability_status === 'available' ? 'default' :
                                  mapping.availability_status === 'low_stock' ? 'secondary' : 'destructive'
                                }
                              >
                                {mapping.availability_status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No ingredient mappings available</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onClose} disabled={isDeploying}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeploy} 
            disabled={!canDeployToAnyStore || isDeploying}
          >
            {isDeploying ? 'Deploying...' : `Deploy to ${selectedStores.length} Store(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
