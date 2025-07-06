import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminRecipesHeader } from './components/AdminRecipesHeader';
import { AdminRecipesMetrics } from './components/AdminRecipesMetrics';
import { AdminRecipesList } from './components/AdminRecipesList';
import { AdminRecipeBulkActions } from './components/AdminRecipeBulkActions';
import { RecipeManagementTab } from './components/RecipeManagementTab';
import { AdminRecipeBulkUploadTab } from './components/AdminRecipeBulkUploadTab';
import { AdminCommissaryIntegrationTab } from './components/AdminCommissaryIntegrationTab';
import { MenuStructureTab } from '@/components/Admin/components/MenuStructureTab';
import { EnhancedRecipeTemplateForm } from '@/components/Admin/components/EnhancedRecipeTemplateForm';
import { StoreSelector } from '@/components/admin/StoreSelector';
import { useAdminRecipesData } from './hooks/useAdminRecipesData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { RecipeDeploymentDialog } from '@/components/Admin/components/RecipeDeploymentDialog';

export default function AdminRecipes() {
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('recipe-templates');
  const [isRecipeFormOpen, setIsRecipeFormOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<string>('');
  const [formSubcategory, setFormSubcategory] = useState<string>('');
  const [selectedStoreForDeployment, setSelectedStoreForDeployment] = useState<string>('');
  const [isDeploymentDialogOpen, setIsDeploymentDialogOpen] = useState(false);
  const [selectedTemplateForDeployment, setSelectedTemplateForDeployment] = useState<any>(null);
  const [selectedStoresForDeployment, setSelectedStoresForDeployment] = useState<Array<{ id: string; name: string }>>([]);
  
  const {
    recipes,
    filteredRecipes,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    storeFilter,
    setStoreFilter,
    isLoading,
    refreshRecipes,
    recipeMetrics,
    stores
  } = useAdminRecipesData();

  const handleCreateRecipeTemplate = (category: string, subcategory?: string) => {
    setFormCategory(category);
    setFormSubcategory(subcategory || '');
    setIsRecipeFormOpen(true);
  };

  const handleBulkCreateMenuTemplates = async () => {
    try {
      const { CROFFLE_RECIPES, DRINK_RECIPES, COMBO_RECIPES } = await import('@/services/recipeManagement/menuRecipeService');
      const { createBulkRecipeTemplates } = await import('@/services/recipeManagement/menuRecipeService');
      
      // Create all menu templates
      const allTemplates = [...CROFFLE_RECIPES, ...DRINK_RECIPES, ...COMBO_RECIPES];
      await createBulkRecipeTemplates(allTemplates);
      
      // Refresh the recipes data
      await refreshRecipes();
      
      toast.success('Menu templates created successfully!');
    } catch (error) {
      console.error('Error creating menu templates:', error);
      toast.error('Failed to create menu templates');
    }
  };

  const handleSelectRecipe = (recipeId: string) => {
    setSelectedRecipes(prev => 
      prev.includes(recipeId) 
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const handleSelectAll = () => {
    setSelectedRecipes(
      selectedRecipes.length === filteredRecipes.length 
        ? [] 
        : filteredRecipes.map(recipe => recipe.id)
    );
  };

  const handleBulkAction = async (action: string) => {
    console.log('Bulk action:', action, 'on recipes:', selectedRecipes);
    
    if (action === 'delete') {
      if (selectedRecipes.length === 0) {
        toast.error('No recipes selected for deletion');
        return;
      }

      if (!window.confirm(`Are you sure you want to delete ${selectedRecipes.length} recipe(s)? This action cannot be undone.`)) {
        return;
      }

      try {
        console.log('Starting bulk delete for recipes:', selectedRecipes);
        
        const recipeIds = [...selectedRecipes];
        console.log('Recipe IDs to delete:', recipeIds);

        // Delete recipe ingredients first
        console.log('Deleting recipe ingredients...');
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .delete()
          .in('recipe_id', recipeIds);

        if (ingredientsError) {
          console.error('Error deleting ingredients:', ingredientsError);
          throw ingredientsError;
        }

        console.log('Recipe ingredients deleted successfully');

        // Delete recipes
        console.log('Deleting recipes...');
        const { error: recipesError, count: recipesCount } = await supabase
          .from('recipes')
          .delete({ count: 'exact' })
          .in('id', recipeIds);

        if (recipesError) {
          console.error('Error deleting recipes:', recipesError);
          throw recipesError;
        }

        console.log(`Deleted ${recipesCount || 0} recipes from database`);

        // Clear selection
        setSelectedRecipes([]);
        
        toast.success(`Successfully deleted ${recipeIds.length} recipe${recipeIds.length !== 1 ? 's' : ''} and their ingredients`);
        
        console.log('Refreshing recipes data...');
        await refreshRecipes();
        
        console.log('Bulk delete completed successfully');
      } catch (error: any) {
        console.error('Error deleting recipes:', error);
        toast.error(`Failed to delete recipes: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Handle other bulk actions
      setSelectedRecipes([]);
      await refreshRecipes();
    }
  };

  const handleEnhancedDeployment = (template: any, selectedStores: Array<{ id: string; name: string }>) => {
    setSelectedTemplateForDeployment(template);
    setSelectedStoresForDeployment(selectedStores);
    setIsDeploymentDialogOpen(true);
  };

  const handleDeploymentComplete = (results: any[]) => {
    // Refresh recipes data after deployment
    refreshRecipes();
    
    // Show detailed results
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0 && failCount === 0) {
      toast.success(`Successfully deployed to all ${successCount} store(s)`);
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`Deployed to ${successCount} store(s), failed on ${failCount} store(s)`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recipe Administration</h1>
        <p className="text-muted-foreground">
          Advanced recipe management with templates, deployment, and analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="menu-structure">Menu Structure</TabsTrigger>
          <TabsTrigger value="recipe-templates">Recipe Templates</TabsTrigger>
          <TabsTrigger value="deployed-recipes">Deployed Recipes</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
          <TabsTrigger value="commissary-integration">Commissary Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="menu-structure" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Complete Menu Structure</h3>
              <p className="text-sm text-muted-foreground">
                Create templates for all menu items with exact pricing
              </p>
            </div>
            <Button onClick={handleBulkCreateMenuTemplates} className="bg-green-600 hover:bg-green-700">
              <Package className="h-4 w-4 mr-2" />
              Create All Menu Templates
            </Button>
          </div>
          
          <MenuStructureTab onCreateRecipeTemplate={handleCreateRecipeTemplate} />
        </TabsContent>

        <TabsContent value="recipe-templates">
          <RecipeManagementTab />
        </TabsContent>

        <TabsContent value="deployed-recipes" className="space-y-6">
          <StoreSelector
            stores={stores}
            selectedStore={selectedStoreForDeployment}
            onStoreChange={setSelectedStoreForDeployment}
            title="Store Management"
            description="Select a store to view and manage its deployed recipes"
          />
          
          <AdminRecipesHeader 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            storeFilter={storeFilter}
            setStoreFilter={setStoreFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            stores={stores}
          />
          
          <AdminRecipesMetrics metrics={recipeMetrics} />
          
          {selectedRecipes.length > 0 && (
            <AdminRecipeBulkActions 
              selectedCount={selectedRecipes.length}
              onBulkAction={handleBulkAction}
              onClearSelection={() => setSelectedRecipes([])}
            />
          )}
          
          <AdminRecipesList
            recipes={filteredRecipes}
            selectedRecipes={selectedRecipes}
            viewMode={viewMode}
            isLoading={isLoading}
            onSelectRecipe={handleSelectRecipe}
            onSelectAll={handleSelectAll}
            onRefresh={refreshRecipes}
            stores={stores}
            onEnhancedDeployment={handleEnhancedDeployment}
          />
        </TabsContent>

        <TabsContent value="bulk-upload">
          <AdminRecipeBulkUploadTab />
        </TabsContent>

        <TabsContent value="commissary-integration">
          <AdminCommissaryIntegrationTab />
        </TabsContent>
      </Tabs>

      <EnhancedRecipeTemplateForm
        isOpen={isRecipeFormOpen}
        onClose={() => setIsRecipeFormOpen(false)}
        category={formCategory}
        subcategory={formSubcategory}
      />

      <RecipeDeploymentDialog
        isOpen={isDeploymentDialogOpen}
        onClose={() => setIsDeploymentDialogOpen(false)}
        templateId={selectedTemplateForDeployment?.id || ''}
        templateName={selectedTemplateForDeployment?.name || ''}
        selectedStores={selectedStoresForDeployment}
        onDeploymentComplete={handleDeploymentComplete}
      />
    </div>
  );
}
