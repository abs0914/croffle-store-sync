
import React from 'react';
import { AdminRecipeCard } from './AdminRecipeCard';
import { AdminRecipeListItem } from './AdminRecipeListItem';
import { Spinner } from '@/components/ui/spinner';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

interface AdminRecipesListProps {
  recipes: Recipe[];
  selectedRecipes: string[];
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onSelectRecipe: (recipeId: string) => void;
  onSelectAll: () => void;
  onRefresh: () => void;
  stores: Store[];
}

export const AdminRecipesList: React.FC<AdminRecipesListProps> = ({
  recipes,
  selectedRecipes,
  viewMode,
  isLoading,
  onSelectRecipe,
  onSelectAll,
  onRefresh,
  stores
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8 text-blue-600" />
        <span className="ml-2 text-gray-600">Loading recipes...</span>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
        <p className="text-gray-500">No recipes match your current search criteria.</p>
      </div>
    );
  }

  const allSelected = selectedRecipes.length === recipes.length && recipes.length > 0;
  const someSelected = selectedRecipes.length > 0 && selectedRecipes.length < recipes.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className={someSelected ? 'data-[state=checked]:bg-blue-600' : ''}
        />
        <span className="text-sm text-gray-600">
          Select all ({recipes.length} recipes)
        </span>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <AdminRecipeCard
              key={recipe.id}
              recipe={recipe}
              isSelected={selectedRecipes.includes(recipe.id)}
              onSelect={() => onSelectRecipe(recipe.id)}
              stores={stores}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map((recipe) => (
            <AdminRecipeListItem
              key={recipe.id}
              recipe={recipe}
              isSelected={selectedRecipes.includes(recipe.id)}
              onSelect={() => onSelectRecipe(recipe.id)}
              stores={stores}
            />
          ))}
        </div>
      )}
    </div>
  );
};
