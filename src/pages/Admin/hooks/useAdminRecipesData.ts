
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
  const [selectedStoreForDeployment, setSelectedStoreForDeployment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  // Fetch recipes when store filter changes
  useEffect(() => {
    fetchRecipes();
  }, [storeFilter]);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching deployed recipes for store filter:', storeFilter);
      
      // Build the query based on store filter with more detailed selection
      let query = supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            *,
            inventory_stock (*)
          ),
          stores:store_id (
            id,
            name,
            location_type
          ),
          products:product_id (
            id,
            name,
            sku,
            price
          )
        `)
        .order('created_at', { ascending: false });

      // Apply store filter if not "all"
      if (storeFilter !== 'all' && storeFilter) {
        console.log('Filtering by store:', storeFilter);
        query = query.eq('store_id', storeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recipes:', error);
        throw error;
      }

      console.log('Fetched raw recipes:', data?.length || 0);
      console.log('Sample recipe data:', data?.[0]);
      
      if (data && data.length > 0) {
        // Check for duplicates before transformation
        const duplicateCheck = data.reduce((acc: any, recipe: any) => {
          const key = `${recipe.name}-${recipe.store_id}`;
          if (!acc[key]) {
            acc[key] = 0;
          }
          acc[key]++;
          return acc;
        }, {});
        
        const duplicates = Object.entries(duplicateCheck).filter(([_, count]) => (count as number) > 1);
        if (duplicates.length > 0) {
          console.warn('Duplicates detected in raw data:', duplicates);
          console.warn('Duplicate recipes by store:', duplicates.map(([key, count]) => `${key}: ${count} copies`));
        }
      }
      
      // Transform the data to match our Recipe interface
      const transformedRecipes = (data || []).map(recipe => ({
        ...recipe,
        ingredients: recipe.recipe_ingredients || [],
        store_name: recipe.stores?.name || 'Unknown Store',
        product_info: recipe.products || null,
        // Add debugging info
        _debug: {
          raw_store_id: recipe.store_id,
          store_name: recipe.stores?.name,
          ingredient_count: recipe.recipe_ingredients?.length || 0,
          has_product: !!recipe.product_id,
          created_at: recipe.created_at
        }
      })) as Recipe[];
      
      console.log('Transformed recipes:', transformedRecipes.length);
      console.log('Recipe transformation sample:', {
        original: data?.[0],
        transformed: transformedRecipes[0]
      });
      
      // Additional duplicate check after transformation
      const transformedDuplicateCheck = transformedRecipes.reduce((acc: any, recipe: any) => {
        const key = `${recipe.name}-${recipe.store_id}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push({
          id: recipe.id,
          created_at: recipe.created_at,
          approval_status: recipe.approval_status
        });
        return acc;
      }, {});
      
      const transformedDuplicates = Object.entries(transformedDuplicateCheck).filter(([_, recipes]) => (recipes as any[]).length > 1);
      if (transformedDuplicates.length > 0) {
        console.error('CRITICAL: Duplicates found in transformed data:', transformedDuplicates);
        transformedDuplicates.forEach(([key, duplicateRecipes]) => {
          console.error(`Duplicate set for ${key}:`, duplicateRecipes);
        });
      }
      
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

      console.log('Fetched stores:', data?.length || 0);
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

    console.log('Filtered recipes:', {
      total: recipes.length,
      filtered: filtered.length,
      searchQuery,
      statusFilter,
      storeFilter
    });

    return filtered;
  }, [recipes, searchQuery, statusFilter]);

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
    
    // Additional debugging metrics
    const recipesWithProducts = recipes.filter(recipe => recipe.product_id).length;
    const recipesWithoutProducts = recipes.filter(recipe => !recipe.product_id).length;
    const recipesWithIngredients = recipes.filter(recipe => recipe.ingredients && recipe.ingredients.length > 0).length;
    
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
    
    console.log('Calculated metrics:', {
      ...metrics,
      recipesWithProducts,
      recipesWithoutProducts,
      recipesWithIngredients,
      storeBreakdown: recipes.reduce((acc: any, recipe) => {
        // Fix: Access store_name from the recipe object directly since we set it during transformation
        const storeName = (recipe as any).store_name || 'Unknown';
        acc[storeName] = (acc[storeName] || 0) + 1;
        return acc;
      }, {})
    });
    
    return metrics;
  }, [recipes]);

  // Custom setter for store filter that also updates selected store for deployment
  const handleStoreFilterChange = (newStoreFilter: string) => {
    console.log('Store filter changing from', storeFilter, 'to:', newStoreFilter);
    setStoreFilter(newStoreFilter);
    setSelectedStoreForDeployment(newStoreFilter);
  };

  return {
    recipes,
    stores,
    filteredRecipes,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    storeFilter,
    setStoreFilter: handleStoreFilterChange,
    selectedStoreForDeployment,
    setSelectedStoreForDeployment,
    isLoading,
    refreshRecipes: fetchRecipes,
    recipeMetrics
  };
};
