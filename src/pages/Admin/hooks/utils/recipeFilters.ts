
import { Recipe } from '@/types/inventoryManagement';
import { useMemo } from 'react';

export const useRecipeFilters = (
  recipes: Recipe[],
  searchQuery: string,
  statusFilter: string
) => {
  return useMemo(() => {
    // Always start with the full recipes array
    let filtered = recipes || [];

    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name?.toLowerCase().includes(query) ||
        (recipe.description && recipe.description.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        switch (statusFilter) {
          case 'active':
            return recipe.is_active;
          case 'inactive':
            return !recipe.is_active;
          case 'pending':
            return recipe.approval_status === 'pending_approval';
          case 'approved':
            return recipe.approval_status === 'approved';
          case 'rejected':
            return recipe.approval_status === 'rejected';
          default:
            return true;
        }
      });
    }

    console.log('Filtered recipes:', {
      total: recipes?.length || 0,
      filtered: filtered.length,
      searchQuery,
      statusFilter
    });

    return filtered;
  }, [recipes, searchQuery, statusFilter]);
};
