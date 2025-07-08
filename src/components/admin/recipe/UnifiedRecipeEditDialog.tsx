import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { RecipeBasicInfoForm } from './RecipeBasicInfoForm';
import { RecipeIngredientsForm } from './RecipeIngredientsForm';
import { RecipeInstructionsForm } from './RecipeInstructionsForm';
import { RecipeDeploymentInfo } from './RecipeDeploymentInfo';
import { UnifiedRecipeItem } from '@/hooks/admin/useUnifiedRecipeState';

interface UnifiedRecipeEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: UnifiedRecipeItem | null;
  onSave: (id: string, updates: Partial<UnifiedRecipeItem>) => void;
  onSyncToRecipes?: (templateId: string, updates: Partial<UnifiedRecipeItem>) => void;
  stores?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export function UnifiedRecipeEditDialog({
  isOpen,
  onClose,
  item,
  onSave,
  onSyncToRecipes,
  stores = [],
  isLoading = false
}: UnifiedRecipeEditDialogProps) {
  const [formData, setFormData] = useState<Partial<UnifiedRecipeItem>>({});
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showSyncWarning, setShowSyncWarning] = useState(false);

  // Initialize form data when item changes
  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        name: item.name,
        description: item.description || '',
        instructions: item.instructions || '',
        category_name: item.category_name || '',
        image_url: item.image_url || '',
        yield_quantity: item.yield_quantity,
        serving_size: item.serving_size,
        is_active: item.is_active
      });
      setIngredients(item.ingredients || []);
      setIsDirty(false);
      setShowSyncWarning(false);
    }
  }, [item, isOpen]);

  // Track form changes
  useEffect(() => {
    if (item) {
      const hasChanges = 
        formData.name !== item.name ||
        formData.description !== item.description ||
        formData.instructions !== item.instructions ||
        formData.yield_quantity !== item.yield_quantity ||
        formData.serving_size !== item.serving_size ||
        formData.is_active !== item.is_active ||
        JSON.stringify(ingredients) !== JSON.stringify(item.ingredients || []);
      
      setIsDirty(hasChanges);
      
      // Show sync warning for template changes that affect deployed recipes
      if (item.item_type === 'template' && item.deployment_count && item.deployment_count > 0 && hasChanges) {
        setShowSyncWarning(true);
      }
    }
  }, [formData, ingredients, item]);

  const handleSave = () => {
    if (!item || !isDirty) return;

    const updates = {
      ...formData,
      ingredients
    };

    onSave(item.id, updates);
  };

  const handleSyncToRecipes = () => {
    if (!item || item.item_type !== 'template' || !onSyncToRecipes) return;

    const updates = {
      ...formData,
      ingredients
    };

    onSyncToRecipes(item.id, updates);
  };

  if (!item) return null;

  const isTemplate = item.item_type === 'template';
  const isRecipe = item.item_type === 'recipe';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold">
                Edit {isTemplate ? 'Template' : 'Recipe'}: {item.name}
              </DialogTitle>
              <Badge variant={isTemplate ? 'default' : 'secondary'}>
                {isTemplate ? 'Template' : 'Recipe'}
              </Badge>
              {isTemplate && item.version && (
                <Badge variant="outline">v{item.version}</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          
          {/* Deployment Status for Templates */}
          {isTemplate && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Deployed to {item.deployment_count || 0} store{item.deployment_count !== 1 ? 's' : ''}
              </span>
              {item.deployed_stores && item.deployed_stores.length > 0 && (
                <span>({item.deployed_stores.join(', ')})</span>
              )}
            </div>
          )}

          {/* Store Info for Recipes */}
          {isRecipe && item.store_name && (
            <div className="text-sm text-muted-foreground">
              Store: {item.store_name}
            </div>
          )}
        </DialogHeader>

        {/* Sync Warning */}
        {showSyncWarning && isTemplate && (
          <Card className="border-orange-200 bg-orange-50 mb-4">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">Template Synchronization</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    This template is deployed to {item.deployment_count} store(s). 
                    Changes will only affect the template unless you sync to deployed recipes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              {isTemplate && <TabsTrigger value="deployment">Deployment</TabsTrigger>}
              {isRecipe && <TabsTrigger value="details">Details</TabsTrigger>}
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="basic" className="mt-0 h-full">
                <RecipeBasicInfoForm
                  formData={formData}
                  onChange={setFormData}
                  isTemplate={isTemplate}
                />
              </TabsContent>

              <TabsContent value="ingredients" className="mt-0 h-full">
                <RecipeIngredientsForm
                  ingredients={ingredients}
                  onChange={setIngredients}
                  storeId={isRecipe ? item.store_id : undefined}
                  isTemplate={isTemplate}
                />
              </TabsContent>

              <TabsContent value="instructions" className="mt-0 h-full">
                <RecipeInstructionsForm
                  instructions={formData.instructions || ''}
                  onChange={(instructions) => setFormData(prev => ({ ...prev, instructions }))}
                />
              </TabsContent>

              {isTemplate && (
                <TabsContent value="deployment" className="mt-0 h-full">
                  <RecipeDeploymentInfo
                    template={item}
                    stores={stores}
                  />
                </TabsContent>
              )}

              {isRecipe && (
                <TabsContent value="details" className="mt-0 h-full">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recipe Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium">Template:</span>
                          <p className="text-sm text-muted-foreground">
                            {(item as any).template_name || 'None'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Status:</span>
                          <p className="text-sm text-muted-foreground">
                            {item.approval_status || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Total Cost:</span>
                          <p className="text-sm text-muted-foreground">
                            ₱{item.total_cost?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Cost per Serving:</span>
                          <p className="text-sm text-muted-foreground">
                            ₱{item.cost_per_serving?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-4 flex justify-between">
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Unsaved Changes
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {isTemplate && showSyncWarning && onSyncToRecipes && (
              <Button
                variant="secondary"
                onClick={handleSyncToRecipes}
                disabled={!isDirty || isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Save & Sync to Recipes
              </Button>
            )}
            
            <Button
              onClick={handleSave}
              disabled={!isDirty || isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              Save {isTemplate ? 'Template' : 'Recipe'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}