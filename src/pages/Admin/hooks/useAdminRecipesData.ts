
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fetchRecipes, fetchStores } from './services/adminRecipesDataService';
import { calculateRecipeMetrics } from './utils/recipeMetricsCalculator';
import { useRecipeFilters } from './utils/recipeFilters';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';

export const useAdminRecipesData = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [selectedStoreForDeployment, setSelectedStoreForDeployment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  // Fetch recipes when store filter changes
  useEffect(() => {
    loadRecipes();
  }, [storeFilter]);

  const loadRecipes = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecipes(storeFilter);
      setRecipes(data);
    } catch (error: any) {
      console.error('Error fetching recipes:', error);
      toast.error('Failed to load recipes');
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const data = await fetchStores();
      setStores(data);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  // Use the filtered recipes hook
  const filteredRecipes = useRecipeFilters(recipes, searchQuery, statusFilter);

  // Calculate metrics using the utility function
  const recipeMetrics = calculateRecipeMetrics(recipes);

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
    refreshRecipes: loadRecipes,
    recipeMetrics
  };
};
