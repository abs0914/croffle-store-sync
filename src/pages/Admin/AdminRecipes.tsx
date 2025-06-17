
import React, { useState } from 'react';
import { AdminRecipesHeader } from './components/AdminRecipesHeader';
import { AdminRecipesMetrics } from './components/AdminRecipesMetrics';
import { AdminRecipesList } from './components/AdminRecipesList';
import { AdminRecipeBulkActions } from './components/AdminRecipeBulkActions';
import { useAdminRecipesData } from './hooks/useAdminRecipesData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminRecipes() {
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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

        // Copy the recipe IDs
        const recipeIds = [...selectedRecipes];
        console.log('Recipe IDs to delete:', recipeIds);

        // First, verify the recipes exist in the database
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

        // Delete recipe ingredients first
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

        // Then delete the recipes themselves
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

        // Clear selection immediately
        setSelectedRecipes([]);
        
        // Show success message
        toast.success(`Successfully deleted ${recipesCount || 0} recipe${(recipesCount || 0) !== 1 ? 's' : ''} and their ingredients`);
        
        // Force refresh the data
        console.log('Refreshing recipes data...');
        await refreshRecipes();
        
        console.log('Bulk delete completed');
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

  return (
    <div className="space-y-6">
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
    </div>
  );
}
