
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';

interface RecipeMetrics {
  totalRecipes: number;
  activeRecipes: number;
  draftRecipes: number;
  deployedStores: number;
  averageCost: number;
}

export const useAdminRecipesData = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecipes();
    fetchStores();
  }, []);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching recipes...');
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(
            *,
            inventory_stock:inventory_stock(*)
          )
        `)
        .order('name');

      if (error) {
        throw error;
      }

      console.log('Fetched recipes:', data?.length || 0);
      setRecipes(data as Recipe[] || []);
    } catch (error: any) {
      console.error('Error fetching recipes:', error);
      toast.error('Failed to load recipes');
      setRecipes([]); // Clear recipes on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      setStores(data as Store[] || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const filteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        (recipe.description && recipe.description.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(recipe => 
        statusFilter === 'active' ? recipe.is_active : !recipe.is_active
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(recipe => recipe.store_id === storeFilter);
    }

    return filtered;
  }, [recipes, searchQuery, statusFilter, storeFilter]);

  const recipeMetrics: RecipeMetrics = useMemo(() => {
    const activeRecipes = recipes.filter(recipe => recipe.is_active).length;
    const draftRecipes = recipes.length - activeRecipes;
    const uniqueStores = new Set(recipes.map(recipe => recipe.store_id)).size;
    
    // Calculate average cost from recipe ingredients
    const totalCost = recipes.reduce((sum, recipe) => {
      const recipeCost = recipe.ingredients?.reduce((ingredientSum, ingredient) => {
        const cost = ingredient.inventory_stock?.cost || 0;
        return ingredientSum + (cost * ingredient.quantity);
      }, 0) || 0;
      return sum + recipeCost;
    }, 0);
    
    const averageCost = recipes.length > 0 ? totalCost / recipes.length : 0;
    
    return {
      totalRecipes: recipes.length,
      activeRecipes,
      draftRecipes,
      deployedStores: uniqueStores,
      averageCost
    };
  }, [recipes]);

  return {
    recipes,
    stores,
    filteredRecipes,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    storeFilter,
    setStoreFilter,
    isLoading,
    refreshRecipes: fetchRecipes,
    recipeMetrics
  };
};
