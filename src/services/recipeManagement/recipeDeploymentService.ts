
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecipeTemplate, DeploymentResult } from "./types";

// Re-export the types for external use
export type { RecipeTemplate, DeploymentResult };

export const deployRecipeToStores = async (
  templateId: string, 
  storeIds: string[]
): Promise<DeploymentResult[]> => {
  const results: DeploymentResult[] = [];
  
  try {
    // Get the template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        recipe_template_ingredients (*)
      `)
      .eq('id', templateId)
      .single();
    
    if (templateError) throw templateError;
    
    for (const storeId of storeIds) {
      try {
        // Create recipe in store with pending approval status
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            name: template.name,
            description: template.description,
            instructions: template.instructions,
            yield_quantity: template.yield_quantity,
            store_id: storeId,
            product_id: '', // Will be set when approved
            is_active: true,
            version: 1,
            approval_status: 'pending_approval',
            category_name: template.category_name
          })
          .select()
          .single();
        
        if (recipeError) throw recipeError;
        
        // Create recipe ingredients
        if (template.recipe_template_ingredients?.length > 0) {
          // First, we need to find corresponding inventory items in the target store
          for (const templateIngredient of template.recipe_template_ingredients) {
            // Try to find existing inventory item or create a placeholder
            const { data: inventoryItem, error: inventoryError } = await supabase
              .from('inventory_stock')
              .select('id')
              .eq('store_id', storeId)
              .eq('item', templateIngredient.commissary_item_name)
              .maybeSingle();
            
            let inventoryStockId = inventoryItem?.id;
            
            // If no inventory item exists, create a placeholder
            if (!inventoryStockId) {
              const { data: newInventoryItem, error: newInventoryError } = await supabase
                .from('inventory_stock')
                .insert({
                  store_id: storeId,
                  item: templateIngredient.commissary_item_name,
                  unit: templateIngredient.unit,
                  stock_quantity: 0,
                  cost: templateIngredient.cost_per_unit || 0,
                  is_active: true
                })
                .select()
                .single();
              
              if (newInventoryError) throw newInventoryError;
              inventoryStockId = newInventoryItem.id;
            }
            
            // Create recipe ingredient with proper unit type casting
            const { error: ingredientError } = await supabase
              .from('recipe_ingredients')
              .insert({
                recipe_id: recipe.id,
                inventory_stock_id: inventoryStockId,
                commissary_item_id: templateIngredient.commissary_item_id,
                quantity: templateIngredient.quantity,
                unit: templateIngredient.unit as any, // Cast to bypass strict type checking
                cost_per_unit: templateIngredient.cost_per_unit
              });
            
            if (ingredientError) throw ingredientError;
          }
        }
        
        results.push({
          storeId,
          success: true,
          recipeId: recipe.id
        });
        
      } catch (error: any) {
        console.error(`Error deploying to store ${storeId}:`, error);
        results.push({
          storeId,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      toast.success(`Recipe deployed to ${successCount} store${successCount !== 1 ? 's' : ''} (pending approval)`);
    }
    
    if (failCount > 0) {
      toast.error(`Failed to deploy to ${failCount} store${failCount !== 1 ? 's' : ''}`);
    }
    
    return results;
    
  } catch (error: any) {
    console.error('Error deploying recipe:', error);
    toast.error('Failed to deploy recipe');
    return [];
  }
};

export const getRecipeDeployments = async (templateId: string) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        store_id,
        product_id,
        approval_status,
        approved_at,
        rejection_reason,
        created_at,
        stores:store_id(name)
      `)
      .eq('name', templateId); // Assuming we match by name for now
    
    if (error) throw error;
    return data || [];
    
  } catch (error: any) {
    console.error('Error fetching deployments:', error);
    return [];
  }
};
