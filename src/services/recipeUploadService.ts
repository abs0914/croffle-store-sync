
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processRecipeUploadAsTemplate } from "./recipeUpload/recipeTemplateProcessor";

// Simplified UploadData interface for template creation (no store needed)
interface TemplateUploadData {
  categoryMap: Map<string, any>;
  commissaryMap: Map<string, any>;
}

export interface RecipeUploadData {
  name: string;
  category: string;
  ingredients: {
    commissary_item_name: string;
    uom: string;
    quantity: number;
    cost_per_unit?: number;
  }[];
}

export const bulkUploadRecipes = async (recipes: RecipeUploadData[]): Promise<boolean> => {
  try {
    console.log('Starting bulk recipe template upload...', recipes.length, 'recipes');

    // Initialize upload data with minimal required properties for templates
    const uploadData: TemplateUploadData = {
      categoryMap: new Map(),
      commissaryMap: new Map()
    };

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process each recipe as a template
    for (const recipeData of recipes) {
      try {
        console.log(`Processing recipe: ${recipeData.name}`);
        console.log(`Recipe ingredients:`, recipeData.ingredients);
        
        // Convert RecipeUploadData to RecipeUpload format
        const recipeUpload = {
          name: recipeData.name,
          category: recipeData.category,
          description: `Recipe template for ${recipeData.name}`,
          yield_quantity: 1,
          serving_size: 1,
          instructions: 'Instructions to be added',
          ingredients: recipeData.ingredients.map(ing => ({
            commissary_item_name: ing.commissary_item_name,
            quantity: ing.quantity,
            uom: ing.uom,
            cost_per_unit: ing.cost_per_unit || 0
          }))
        };

        console.log(`Converted recipe upload:`, recipeUpload);

        const success = await processRecipeUploadAsTemplate(recipeUpload, uploadData);
        
        if (success) {
          successCount++;
          console.log(`Successfully processed: ${recipeData.name}`);
        } else {
          failCount++;
          errors.push(`Failed to process recipe: ${recipeData.name}`);
          console.error(`Failed to process: ${recipeData.name}`);
        }
      } catch (error) {
        failCount++;
        const errorMsg = `Error processing ${recipeData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    // Show results
    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} recipe template(s)`);
    }

    if (failCount > 0) {
      toast.warning(`${failCount} recipe(s) failed to upload. Check console for details.`);
      console.error('Upload errors:', errors);
    }

    return successCount > 0;

  } catch (error) {
    console.error('Error in bulk recipe upload:', error);
    toast.error('Failed to upload recipe templates');
    return false;
  }
};
