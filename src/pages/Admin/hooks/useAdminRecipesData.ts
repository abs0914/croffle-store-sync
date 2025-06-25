import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';
import { getDeployedRecipes } from '@/services/recipeManagement/recipeDataService';

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
      
      const data = await getDeployedRecipes();
      console.log('Fetched deployed recipes:', data?.length || 0);
      console.log('Recipe data:', data);
      
      // Set recipes directly without delays or timeouts
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

      // Transform database data to match Store interface
      const transformedStores: Store[] = (data || []).map((store: any) => ({
        id: store.id,
        name: store.name,
        location: store.address || store.city || 'N/A',
        phone: store.phone,
        email: store.email,
        address: store.address,
        tax_id: store.tax_id,
        logo_url: store.logo_url,
        is_active: store.is_active,
        created_at: store.created_at,
        updated_at: store.updated_at,
        location_type: store.location_type,
        region: store.region,
        logistics_zone: store.logistics_zone,
        ownership_type: store.ownership_type,
        franchise_agreement_date: store.franchise_agreement_date,
        franchise_fee_percentage: store.franchise_fee_percentage,
        franchisee_contact_info: store.franchisee_contact_info,
      }));

      setStores(transformedStores);
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
    const activeRecipes = recipes.filter(recipe => recipe.is_active).length;
    const draftRecipes = recipes.filter(recipe => recipe.approval_status === 'draft' || !recipe.approval_status).length;
    const pendingApproval = recipes.filter(recipe => recipe.approval_status === 'pending_approval').length;
    const approved = recipes.filter(recipe => recipe.approval_status === 'approved').length;
    const rejected = recipes.filter(recipe => recipe.approval_status === 'rejected').length;
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
      averageCost,
      pendingApproval,
      approved,
      rejected
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
