
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
  pendingApproval: number;
  approved: number;
  rejected: number;
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
      console.log('Fetching deployed recipes...');
      
      // Fetch all deployed recipes with their ingredients and store information
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            *,
            inventory_stock (*)
          ),
          stores:store_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recipes:', error);
        throw error;
      }

      console.log('Fetched recipes:', data?.length || 0);
      console.log('Recipe data sample:', data?.[0]);
      
      // Transform the data to match our Recipe interface
      const transformedRecipes = (data || []).map(recipe => ({
        ...recipe,
        ingredients: recipe.recipe_ingredients || [],
        store_name: recipe.stores?.name || 'Unknown Store'
      })) as Recipe[];
      
      setRecipes(transformedRecipes);
      
    } catch (error: any) {
      console.error('Error fetching recipes:', error);
      toast.error('Failed to load recipes');
      setRecipes([]);
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

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(recipe => recipe.store_id === storeFilter);
    }

    return filtered;
  }, [recipes, searchQuery, statusFilter, storeFilter]);

  const recipeMetrics: RecipeMetrics = useMemo(() => {
    console.log('Calculating metrics for recipes:', recipes.length);
    
    const activeRecipes = recipes.filter(recipe => recipe.is_active).length;
    const draftRecipes = recipes.filter(recipe => recipe.approval_status === 'draft' || !recipe.approval_status).length;
    const pendingApproval = recipes.filter(recipe => recipe.approval_status === 'pending_approval').length;
    const approved = recipes.filter(recipe => recipe.approval_status === 'approved').length;
    const rejected = recipes.filter(recipe => recipe.approval_status === 'rejected').length;
    
    // Calculate unique stores that have deployed recipes
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
    
    const metrics = {
      totalRecipes: recipes.length,
      activeRecipes,
      draftRecipes,
      deployedStores: uniqueStores,
      averageCost,
      pendingApproval,
      approved,
      rejected
    };
    
    console.log('Calculated metrics:', metrics);
    return metrics;
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
