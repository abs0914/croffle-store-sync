
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
        
        // Delete in a transaction-like manner
        const recipeIds = [...selectedRecipes]; // Copy the array
        
        // First delete all recipe ingredients for the selected recipes
        console.log('Deleting recipe ingredients...');
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .delete()
          .in('recipe_id', recipeIds);

        if (ingredientsError) {
          console.error('Error deleting ingredients:', ingredientsError);
          throw ingredientsError;
        }

        console.log('Ingredients deleted successfully');

        // Then delete the recipes themselves
        console.log('Deleting recipes...');
        const { error: recipesError } = await supabase
          .from('recipes')
          .delete()
          .in('id', recipeIds);

        if (recipesError) {
          console.error('Error deleting recipes:', recipesError);
          throw recipesError;
        }

        console.log('Recipes deleted successfully');

        // Clear selection immediately
        setSelectedRecipes([]);
        
        // Show success message
        toast.success(`Successfully deleted ${recipeIds.length} recipe${recipeIds.length !== 1 ? 's' : ''} and their ingredients`);
        
        // Force refresh with multiple attempts to ensure UI updates
        console.log('Refreshing recipes data...');
        await refreshRecipes();
        
        // Additional refresh after a short delay to ensure state is updated
        setTimeout(async () => {
          console.log('Secondary refresh...');
          await refreshRecipes();
        }, 500);
        
        console.log('Recipes refreshed');
      } catch (error) {
        console.error('Error deleting recipes:', error);
        toast.error('Failed to delete recipes');
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
