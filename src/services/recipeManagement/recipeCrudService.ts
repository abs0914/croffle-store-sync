
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecipeTemplate, RecipeTemplateIngredient } from "./types";

export const createRecipeTemplate = async (
  template: Omit<RecipeTemplate, 'id' | 'created_at' | 'updated_at' | 'ingredients'>, 
  ingredients: Omit<RecipeTemplateIngredient, 'id' | 'recipe_template_id' | 'created_at'>[]
): Promise<RecipeTemplate | null> => {
  try {
    // For now, create using the existing recipes table
    const { data: templateData, error: templateError } = await supabase
      .from('recipes')
      .insert({
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size,
        version: template.version,
        is_active: template.is_active,
        store_id: '00000000-0000-0000-0000-000000000000', // Template store ID
        product_id: '00000000-0000-0000-0000-000000000000' // Placeholder product ID
      })
      .select()
      .single();

    if (templateError) throw templateError;

    toast.success('Recipe template created successfully');
    return templateData as any;
  } catch (error: any) {
    console.error('Error creating recipe template:', error);
    toast.error('Failed to create recipe template');
    return null;
  }
};

export const updateRecipeTemplate = async (
  id: string, 
  updates: Partial<RecipeTemplate>, 
  ingredients?: Omit<RecipeTemplateIngredient, 'id' | 'recipe_template_id' | 'created_at'>[]
): Promise<RecipeTemplate | null> => {
  try {
    const { data: templateData, error: templateError } = await supabase
      .from('recipes')
      .update({
        name: updates.name,
        description: updates.description,
        instructions: updates.instructions,
        yield_quantity: updates.yield_quantity,
        serving_size: updates.serving_size,
        version: (updates.version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (templateError) throw templateError;

    toast.success('Recipe template updated successfully');
    return templateData as any;
  } catch (error: any) {
    console.error('Error updating recipe template:', error);
    toast.error('Failed to update recipe template');
    return null;
  }
};

export const deleteRecipeTemplate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Recipe template deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting recipe template:', error);
    toast.error('Failed to delete recipe template');
    return false;
  }
};

export const duplicateRecipeTemplate = async (id: string): Promise<RecipeTemplate | null> => {
  try {
    const { data: template, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const duplicatedTemplate = {
      ...template,
      name: `Copy of ${template.name}`,
      version: 1
    };

    delete duplicatedTemplate.id;
    delete duplicatedTemplate.created_at;
    delete duplicatedTemplate.updated_at;

    const { data: newTemplate, error: createError } = await supabase
      .from('recipes')
      .insert(duplicatedTemplate)
      .select()
      .single();

    if (createError) throw createError;

    toast.success('Recipe template duplicated successfully');
    return newTemplate as any;
  } catch (error: any) {
    console.error('Error duplicating recipe template:', error);
    toast.error('Failed to duplicate recipe template');
    return null;
  }
};
