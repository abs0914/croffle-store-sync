
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
        const { error } = await supabase
          .from('recipes')
          .update({ is_active: false })
          .in('id', selectedRecipes);

        if (error) {
          throw error;
        }

        toast.success(`Successfully deleted ${selectedRecipes.length} recipe${selectedRecipes.length !== 1 ? 's' : ''}`);
        setSelectedRecipes([]);
        await refreshRecipes();
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
