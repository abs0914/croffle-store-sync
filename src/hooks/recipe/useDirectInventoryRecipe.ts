import { useState, useEffect } from 'react';
import { 
  DirectInventoryIngredient, 
  getDirectInventoryItems, 
  calculateDirectRecipeCost,
  checkDirectIngredientAvailability,
  deductDirectInventoryIngredients
} from '@/services/recipeManagement/directInventoryService';
import { toast } from 'sonner';

export const useDirectInventoryRecipe = (storeId?: string) => {
  const [ingredients, setIngredients] = useState<DirectInventoryIngredient[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (storeId) {
      loadAvailableItems();
    }
  }, [storeId]);

  useEffect(() => {
    setTotalCost(calculateDirectRecipeCost(ingredients));
  }, [ingredients]);

  const loadAvailableItems = async () => {
    setLoading(true);
    try {
      const items = await getDirectInventoryItems(storeId);
      setAvailableItems(items);
    } catch (error) {
      console.error('Error loading available items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    const newIngredient: DirectInventoryIngredient = {
      ingredient_name: '',
      quantity: 1,
      unit: 'pieces',
      location_type: 'all',
      supports_fractional: false
    };
    setIngredients(prev => [...prev, newIngredient]);
  };

  const updateIngredient = (index: number, field: keyof DirectInventoryIngredient, value: any) => {
    setIngredients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const checkAvailability = async (multiplier: number = 1) => {
    if (!storeId) {
      toast.error('Store ID required for availability check');
      return { available: false, unavailableItems: [] };
    }

    return await checkDirectIngredientAvailability(ingredients, storeId, multiplier);
  };

  const useRecipe = async (recipeId: string, multiplier: number = 1) => {
    if (!storeId) {
      toast.error('Store ID required for recipe usage');
      return false;
    }

    const availability = await checkAvailability(multiplier);
    if (!availability.available) {
      const itemsList = availability.unavailableItems
        .map(item => `${item.ingredient_name} (need ${item.required}, have ${item.available})`)
        .join(', ');
      toast.error(`Insufficient ingredients: ${itemsList}`);
      return false;
    }

    const success = await deductDirectInventoryIngredients(recipeId, ingredients, multiplier);
    if (success) {
      toast.success(`Recipe ingredients deducted successfully (${multiplier}x)`);
      await loadAvailableItems(); // Refresh available items
    } else {
      toast.error('Failed to deduct recipe ingredients');
    }

    return success;
  };

  return {
    ingredients,
    setIngredients,
    availableItems,
    loading,
    totalCost,
    addIngredient,
    updateIngredient,
    removeIngredient,
    checkAvailability,
    useRecipe,
    refreshItems: loadAvailableItems
  };
};