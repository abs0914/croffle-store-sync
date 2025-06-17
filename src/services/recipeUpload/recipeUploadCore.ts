
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { toast } from "sonner";
import { fetchDataForUpload } from "./recipeUploadHelpers";
import { processRecipeUpload } from "./recipeUploadProcessor";

export const bulkUploadRecipes = async (recipes: RecipeUpload[], storeId: string): Promise<boolean> => {
  try {
    console.log(`Starting bulk upload of ${recipes.length} recipes for store ${storeId}`);
    
    // Fetch all required data for the upload process
    const uploadData = await fetchDataForUpload(storeId);
    
    let successCount = 0;
    let errorCount = 0;

    // Process each recipe
    for (const recipe of recipes) {
      try {
        console.log(`Processing recipe: ${recipe.name}`);
        const success = await processRecipeUpload(recipe, storeId, uploadData);
        
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
      toast.success(`Successfully uploaded ${successCount} recipes${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
    }
    
    if (errorCount > 0 && successCount === 0) {
      toast.error(`Failed to upload recipes. Please check that ingredient names match items in commissary inventory.`);
      return false;
    }

    return successCount > 0;
  } catch (error) {
    console.error('Error bulk uploading recipes:', error);
    toast.error('Failed to upload recipes');
    return false;
  }
};
