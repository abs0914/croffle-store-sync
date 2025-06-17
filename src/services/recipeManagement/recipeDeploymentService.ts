
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
      .from('recipes')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (templateError) throw templateError;
    
    for (const storeId of storeIds) {
      try {
        // 1. Create/Update product in the store
        const { data: product, error: productError } = await supabase
          .from('products')
          .upsert({
            name: template.name,
            description: template.description,
            store_id: storeId,
            price: 0, // Will be set by store manager
            cost: template.total_cost || 0,
            stock_quantity: 0,
            is_active: true,
            sku: `RCP-${template.name.replace(/\s+/g, '-').toUpperCase()}-${storeId.slice(-4)}`
          })
          .select()
          .single();
        
        if (productError) throw productError;
        
        // 2. Create recipe linked to the product
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            name: template.name,
            description: template.description,
            instructions: template.instructions,
            yield_quantity: template.yield_quantity,
            store_id: storeId,
            product_id: product.id,
            is_active: true,
            version: 1
          })
          .select()
          .single();
        
        if (recipeError) throw recipeError;
        
        results.push({
          storeId,
          success: true,
          recipeId: recipe.id,
          productId: product.id
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
      toast.success(`Recipe deployed to ${successCount} store${successCount !== 1 ? 's' : ''}`);
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
