
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminRecipesHeader } from './components/AdminRecipesHeader';
import { AdminRecipesMetrics } from './components/AdminRecipesMetrics';
import { AdminRecipesList } from './components/AdminRecipesList';
import { AdminRecipeBulkActions } from './components/AdminRecipeBulkActions';
import { RecipeManagementTab } from './components/RecipeManagementTab';
import { AdminRecipeBulkUploadTab } from './components/AdminRecipeBulkUploadTab';
import { AdminCommissaryIntegrationTab } from './components/AdminCommissaryIntegrationTab';
import { MenuStructureTab } from './components/MenuStructureTab';
import { EnhancedRecipeTemplateForm } from './components/EnhancedRecipeTemplateForm';
import { useAdminRecipesData } from './hooks/useAdminRecipesData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminRecipes() {
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState('menu-structure');
  const [isRecipeFormOpen, setIsRecipeFormOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<string>('');
  const [formSubcategory, setFormSubcategory] = useState<string>('');
  
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
      try {
        console.log('Starting bulk delete for recipes:', selectedRecipes);
        
        if (selectedRecipes.length === 0) {
          toast.error('No recipes selected for deletion');
          return;
        }

        const recipeIds = [...selectedRecipes];
        console.log('Recipe IDs to delete:', recipeIds);

        const { data: existingRecipes, error: checkError } = await supabase
          .from('recipes')
          .select('id, name')
          .in('id', recipeIds);

        if (checkError) {
          console.error('Error checking existing recipes:', checkError);
          throw checkError;
        }

        console.log('Found existing recipes to delete:', existingRecipes?.length || 0);

        if (!existingRecipes || existingRecipes.length === 0) {
          toast.error('No matching recipes found in database');
          return;
        }

        console.log('Deleting recipe ingredients...');
        const { error: ingredientsError, count: ingredientsCount } = await supabase
          .from('recipe_ingredients')
          .delete({ count: 'exact' })
          .in('recipe_id', recipeIds);

        if (ingredientsError) {
          console.error('Error deleting ingredients:', ingredientsError);
          throw ingredientsError;
        }

        console.log(`Deleted ${ingredientsCount || 0} recipe ingredients`);

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

        setSelectedRecipes([]);
        
        toast.success(`Successfully deleted ${recipeIds.length} recipe${recipeIds.length !== 1 ? 's' : ''} and their ingredients`);
        
        console.log('Refreshing recipes data...');
        await refreshRecipes();
        
        console.log('Bulk delete completed');
      } catch (error: any) {
        console.error('Error deleting recipes:', error);
        toast.error(`Failed to delete recipes: ${error.message || 'Unknown error'}`);
      }
    } else {
      setSelectedRecipes([]);
      await refreshRecipes();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recipe Administration</h1>
        <p className="text-muted-foreground">
          Manage recipe templates, deployed recipes, and commissary integration across all stores
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

        <TabsContent value="menu-structure">
          <MenuStructureTab onCreateRecipeTemplate={handleCreateRecipeTemplate} />
        </TabsContent>

        <TabsContent value="recipe-templates">
          <RecipeManagementTab />
        </TabsContent>

        <TabsContent value="deployed-recipes" className="space-y-6">
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
    </div>
  );
}
