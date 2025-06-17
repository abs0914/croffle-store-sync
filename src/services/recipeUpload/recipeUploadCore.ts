
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { toast } from "sonner";
import { fetchDataForUpload } from "./recipeUploadHelpers";
import { processRecipeUploadAsTemplate } from "./recipeTemplateProcessor";

export const bulkUploadRecipes = async (recipes: RecipeUpload[], storeId?: string): Promise<boolean> => {
  try {
    console.log(`Starting bulk upload of ${recipes.length} recipes as templates`);
    
    // For template creation, we don't need store-specific data, but we still need commissary data
    const uploadData = await fetchDataForUpload(storeId || '');
    
    let successCount = 0;
    let errorCount = 0;

    // Process each recipe as a template
    for (const recipe of recipes) {
      try {
        console.log(`Processing recipe template: ${recipe.name}`);
        const success = await processRecipeUploadAsTemplate(recipe, uploadData);
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error processing recipe ${recipe.name}:`, error);
        errorCount++;
      }
    }

    // Show results to user
    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} recipe template${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
    }
    
    if (errorCount > 0 && successCount === 0) {
      toast.error(`Failed to create recipe templates. Please check that ingredient names match items in commissary inventory.`);
      return false;
    }

    return successCount > 0;
  } catch (error) {
    console.error('Error bulk uploading recipes as templates:', error);
    toast.error('Failed to create recipe templates');
    return false;
  }
};
