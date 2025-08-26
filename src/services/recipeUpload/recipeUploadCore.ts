
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { toast } from "sonner";
import { fetchDataForUpload } from "./recipeUploadHelpers";
import { processRecipeUploadAsTemplate } from "./recipeTemplateProcessor";

export const bulkUploadRecipes = async (recipes: RecipeUpload[], storeId?: string): Promise<boolean> => {
  try {
    console.log(`Starting bulk upload of ${recipes.length} recipes as templates`);
    
    // For template creation, we need commissary data for validation
    const uploadData = await fetchDataForUpload(storeId || '');
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each recipe as a template
    for (const recipe of recipes) {
      try {
        console.log(`Processing recipe template: ${recipe.name}`);
        const success = await processRecipeUploadAsTemplate(recipe, uploadData);
        
        if (success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`Failed to create template for "${recipe.name}"`);
        }
      } catch (error) {
        console.error(`Error processing recipe ${recipe.name}:`, error);
        errorCount++;
        errors.push(`Error processing "${recipe.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Upload complete: ${successCount} successful, ${errorCount} failed`);

    // Show results to user
    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} recipe template${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
    }
    
    if (errorCount > 0) {
      if (successCount === 0) {
        toast.error(`Failed to create recipe templates. Please check that ingredient names match items in commissary inventory.`);
      } else {
        toast.warning(`${errorCount} recipe templates failed to create. Check console for details.`);
      }
      
      // Log errors for debugging
      errors.forEach(error => console.error('Upload error:', error));
    }

    return successCount > 0;
  } catch (error) {
    console.error('Error bulk uploading recipes as templates:', error);
    toast.error('Failed to create recipe templates');
    return false;
  }
};
