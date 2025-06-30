
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  EnhancedRecipeIngredient, 
  BulkInventoryMapping,
  saveEnhancedRecipeIngredients,
  saveEnhancedTemplateIngredients,
  calculateEnhancedRecipeCost
} from '@/services/recipeManagement/enhancedIngredientService';

export const useEnhancedRecipeIngredients = (recipeId?: string, templateId?: string) => {
  const [ingredients, setIngredients] = useState<EnhancedRecipeIngredient[]>([]);
  const [bulkMappings, setBulkMappings] = useState<BulkInventoryMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (recipeId || templateId) {
      loadIngredients();
    }
  }, [recipeId, templateId]);

  useEffect(() => {
    setTotalCost(calculateEnhancedRecipeCost(ingredients));
  }, [ingredients]);

  const loadIngredients = async () => {
    setLoading(true);
    try {
      if (recipeId) {
        // Load recipe ingredients
        const { data } = await supabase
          .from('recipe_ingredients')
          .select(`
            *,
            commissary_inventory(name, unit)
          `)
          .eq('recipe_id', recipeId);

        if (data) {
          const mappedIngredients: EnhancedRecipeIngredient[] = data.map(ing => ({
            id: ing.id,
            ingredient_name: ing.ingredient_name || 'Unknown',
            recipe_unit: ing.recipe_unit || ing.unit,
            purchase_unit: ing.purchase_unit,
            quantity: ing.quantity,
            conversion_factor: ing.conversion_factor || 1,
            cost_per_unit: ing.cost_per_unit || 0,
            cost_per_recipe_unit: ing.cost_per_recipe_unit || 0,
            commissary_item_id: ing.commissary_item_id
          }));
          setIngredients(mappedIngredients);
        }

        // Load bulk mappings
        const { data: mappingsData } = await supabase
          .from('inventory_conversion_mappings')
          .select(`
            *,
            inventory_stock(item, unit)
          `)
          .eq('recipe_ingredient_name', ingredients.map(i => i.ingredient_name));

        // Transform mappings data
        // This would need to be implemented based on the actual data structure
        
      } else if (templateId) {
        // Load template ingredients
        const { data } = await supabase
          .from('recipe_template_ingredients')
          .select('*')
          .eq('recipe_template_id', templateId);

        if (data) {
          const mappedIngredients: EnhancedRecipeIngredient[] = data.map(ing => ({
            ingredient_name: ing.ingredient_name,
            recipe_unit: ing.recipe_unit || ing.unit,
            purchase_unit: ing.purchase_unit,
            quantity: ing.quantity,
            conversion_factor: ing.conversion_factor || 1,
            cost_per_unit: ing.cost_per_unit || 0,
            cost_per_recipe_unit: ing.cost_per_recipe_unit || 0,
            commissary_item_id: ing.commissary_item_id
          }));
          setIngredients(mappedIngredients);
        }
      }
    } catch (error) {
      console.error('Error loading enhanced ingredients:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveIngredients = async (
    newIngredients: EnhancedRecipeIngredient[],
    newBulkMappings: BulkInventoryMapping[]
  ): Promise<boolean> => {
    setLoading(true);
    try {
      let success = false;
      
      if (recipeId) {
        success = await saveEnhancedRecipeIngredients(recipeId, newIngredients, newBulkMappings);
      } else if (templateId) {
        success = await saveEnhancedTemplateIngredients(templateId, newIngredients);
      }

      if (success) {
        setIngredients(newIngredients);
        setBulkMappings(newBulkMappings);
        await loadIngredients(); // Reload to get updated data
      }

      return success;
    } catch (error) {
      console.error('Error saving enhanced ingredients:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    ingredients,
    bulkMappings,
    loading,
    totalCost,
    saveIngredients,
    refreshIngredients: loadIngredients
  };
};
