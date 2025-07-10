import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Store, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Settings,
  Rocket,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';
import { useRecipeDeployment } from '@/hooks/useRecipeDeployment';
import { StoreSelector } from '@/components/uploads/StoreSelector';
import { 
  EnhancedDeploymentConfig, 
  IngredientSubstitution,
  DeploymentProgress 
} from '@/types/recipeManagement';
import { toast } from 'sonner';

interface EnhancedRecipeDeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
  stores: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function EnhancedRecipeDeploymentDialog({
  isOpen,
  onClose,
  template,
  stores,
  onSuccess
}: EnhancedRecipeDeploymentDialogProps) {
  const {
    isDeploying,
    deploymentProgress,
    pricingProfiles,
    deployRecipeEnhanced,
    fetchPricingProfiles,
    checkIngredientAvailability
  } = useRecipeDeployment();

  const [activeTab, setActiveTab] = useState('stores');
  const [selectedStores, setSelectedStores] = useState<Array<{ id: string; name: string }>>([]);
  const [deploymentOptions, setDeploymentOptions] = useState({
    actualPrice: 0,
    customName: '',
    customDescription: '',
    isActive: true,
    pricingProfileId: ''
  });
  const [ingredientSubstitutions, setIngredientSubstitutions] = useState<IngredientSubstitution[]>([]);
  const [validateIngredients, setValidateIngredients] = useState(true);
  const [createProducts, setCreateProducts] = useState(false);
  const [ingredientAvailability, setIngredientAvailability] = useState<Record<string, { available: string[]; missing: string[] }>>({});

  useEffect(() => {
    if (template && isOpen) {
      // Calculate base cost from template ingredients
      const baseCost = template.ingredients?.reduce((sum: number, ingredient: any) => 
        sum + ((ingredient.quantity || 0) * (ingredient.cost_per_unit || 0)), 0
      ) || 0;
      
      setDeploymentOptions(prev => ({
        ...prev,
        customName: template.name,
        customDescription: template.description || '',
        actualPrice: baseCost > 0 ? Math.round(baseCost * 1.5 * 100) / 100 : 0 // 50% markup as default
      }));
    }
  }, [template, isOpen]);

  useEffect(() => {
    if (selectedStores.length > 0) {
      fetchPricingProfiles(selectedStores.map(s => s.id));
    }
  }, [selectedStores, fetchPricingProfiles]);

  const handleStoreToggle = (store: { id: string; name: string }) => {
    setSelectedStores(prev => {
      const exists = prev.find(s => s.id === store.id);
      if (exists) {
        return prev.filter(s => s.id !== store.id);
      } else {
        return [...prev, store];
      }
    });
  };

  const handleCheckIngredients = async () => {
    if (selectedStores.length === 0) {
      toast.error('Please select stores first');
      return;
    }

    const availability = await checkIngredientAvailability(
      template.id,
      selectedStores.map(s => s.id)
    );
    setIngredientAvailability(availability);
    setActiveTab('ingredients');
  };

  const handleAddSubstitution = () => {
    setIngredientSubstitutions(prev => [
      ...prev,
      {
        originalIngredientName: '',
        substituteIngredientName: '',
        substituteCostPerUnit: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveSubstitution = (index: number) => {
    setIngredientSubstitutions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubstitutionChange = (index: number, field: keyof IngredientSubstitution, value: string | number) => {
    setIngredientSubstitutions(prev => prev.map((sub, i) => 
      i === index ? { ...sub, [field]: value } : sub
    ));
  };

  const handleDeploy = async () => {
    if (selectedStores.length === 0) {
      toast.error('Please select at least one store');
      return;
    }

    const config: EnhancedDeploymentConfig = {
      templateId: template.id,
      selectedStores,
      deploymentOptions,
      ingredientSubstitutions,
      validateIngredients,
      createProducts
    };

    const results = await deployRecipeEnhanced(config);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`Successfully deployed to ${successCount} store${successCount !== 1 ? 's' : ''}`);
    }
    
    if (errorCount > 0) {
      toast.error(`Failed to deploy to ${errorCount} store${errorCount !== 1 ? 's' : ''}`);
    }

    if (successCount > 0) {
      onSuccess();
    }

    // Keep dialog open to show results
    setActiveTab('progress');
  };

  const getProgressIcon = (progress: DeploymentProgress) => {
    switch (progress.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in-progress':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Enhanced Recipe Deployment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Deploy "{template?.name}" to multiple stores with advanced options
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Stores
            </TabsTrigger>
            <TabsTrigger value="options" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Options
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="stores" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map(store => {
                  const isSelected = selectedStores.some(s => s.id === store.id);
                  return (
                    <Card
                      key={store.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleStoreToggle(store)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Store className="h-5 w-5" />
                            <span className="font-medium">{store.name}</span>
                          </div>
                          {isSelected && <CheckCircle className="h-5 w-5 text-green-600" />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {selectedStores.length > 0 && (
                <div className="space-y-4">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Selected Stores ({selectedStores.length})</h4>
                      <p className="text-sm text-muted-foreground">
                        Recipe will be deployed to these stores
                      </p>
                    </div>
                    <Button onClick={handleCheckIngredients} variant="outline">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Check Ingredients
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStores.map(store => (
                      <Badge key={store.id} variant="secondary">
                        {store.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="options" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deployment Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customName">Custom Recipe Name</Label>
                      <Input
                        id="customName"
                        value={deploymentOptions.customName}
                        onChange={(e) => setDeploymentOptions(prev => ({ ...prev, customName: e.target.value }))}
                        placeholder="Leave empty to use template name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="actualPrice">Price Amount (₱)</Label>
                      <Input
                        id="actualPrice"
                        type="number"
                        value={deploymentOptions.actualPrice}
                        onChange={(e) => setDeploymentOptions(prev => ({ ...prev, actualPrice: Number(e.target.value) }))}
                        min="0"
                        step="0.01"
                        placeholder="Enter price amount"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="customDescription">Custom Description</Label>
                    <Textarea
                      id="customDescription"
                      value={deploymentOptions.customDescription}
                      onChange={(e) => setDeploymentOptions(prev => ({ ...prev, customDescription: e.target.value }))}
                      placeholder="Leave empty to use template description"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Recipe Active Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Whether the deployed recipes should be active
                      </p>
                    </div>
                    <Switch
                      checked={deploymentOptions.isActive}
                      onCheckedChange={(checked) => setDeploymentOptions(prev => ({ ...prev, isActive: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Validate Ingredients</Label>
                      <p className="text-sm text-muted-foreground">
                        Check ingredient availability before deployment
                      </p>
                    </div>
                    <Switch
                      checked={validateIngredients}
                      onCheckedChange={setValidateIngredients}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Create Products</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically create sellable products from deployed recipes
                      </p>
                    </div>
                    <Switch
                      checked={createProducts}
                      onCheckedChange={setCreateProducts}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ingredients" className="space-y-4 mt-4">
              {Object.keys(ingredientAvailability).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(ingredientAvailability).map(([storeId, data]) => {
                    const store = stores.find(s => s.id === storeId);
                    return (
                      <Card key={storeId}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            {store?.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-green-600 mb-2">Available ({data.available.length})</h4>
                              {data.available.length > 0 ? (
                                <div className="space-y-1">
                                  {data.available.map((ingredient, index) => (
                                    <Badge key={index} variant="outline" className="text-green-600 border-green-200">
                                      {ingredient}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No ingredients available</p>
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-red-600 mb-2">Missing ({data.missing.length})</h4>
                              {data.missing.length > 0 ? (
                                <div className="space-y-1">
                                  {data.missing.map((ingredient, index) => (
                                    <Badge key={index} variant="outline" className="text-red-600 border-red-200">
                                      {ingredient}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">All ingredients available</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Ingredient Substitutions</span>
                        <Button onClick={handleAddSubstitution} size="sm">
                          Add Substitution
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {ingredientSubstitutions.map((substitution, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                          <div>
                            <Label>Original Ingredient</Label>
                            <Input
                              value={substitution.originalIngredientName}
                              onChange={(e) => handleSubstitutionChange(index, 'originalIngredientName', e.target.value)}
                              placeholder="Original ingredient"
                            />
                          </div>
                          <div>
                            <Label>Substitute</Label>
                            <Input
                              value={substitution.substituteIngredientName}
                              onChange={(e) => handleSubstitutionChange(index, 'substituteIngredientName', e.target.value)}
                              placeholder="Substitute ingredient"
                            />
                          </div>
                          <div>
                            <Label>Cost per Unit</Label>
                            <Input
                              type="number"
                              value={substitution.substituteCostPerUnit}
                              onChange={(e) => handleSubstitutionChange(index, 'substituteCostPerUnit', Number(e.target.value))}
                              placeholder="0.00"
                              step="0.01"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveSubstitution(index)}
                              className="w-full"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      {ingredientSubstitutions.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No ingredient substitutions configured. Add substitutions for missing ingredients.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">No Ingredient Check Performed</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select stores and click "Check Ingredients" to verify availability
                    </p>
                    <Button onClick={handleCheckIngredients} disabled={selectedStores.length === 0}>
                      Check Ingredients
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="progress" className="space-y-4 mt-4">
              {deploymentProgress.length > 0 ? (
                <div className="space-y-4">
                  {deploymentProgress.map((progress) => (
                    <Card key={progress.storeId}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getProgressIcon(progress)}
                            <span className="font-medium">{progress.storeName}</span>
                            <Badge variant={
                              progress.status === 'success' ? 'default' :
                              progress.status === 'error' ? 'destructive' :
                              progress.status === 'in-progress' ? 'secondary' : 'outline'
                            }>
                              {progress.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {progress.progress}%
                          </span>
                        </div>
                        <Progress value={progress.progress} className="mb-2" />
                        {progress.error && (
                          <p className="text-sm text-red-600">{progress.error}</p>
                        )}
                        {progress.warnings && progress.warnings.length > 0 && (
                          <div className="text-sm text-yellow-600">
                            {progress.warnings.map((warning, index) => (
                              <p key={index}>{warning}</p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-2">Ready to Deploy</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your deployment settings and click Deploy to start
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>

          <div className="border-t pt-4 flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="space-x-2">
              {activeTab !== 'progress' && (
                <Button
                  onClick={handleDeploy}
                  disabled={isDeploying || selectedStores.length === 0}
                >
                  {isDeploying ? 'Deploying...' : `Deploy to ${selectedStores.length} Store${selectedStores.length !== 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
