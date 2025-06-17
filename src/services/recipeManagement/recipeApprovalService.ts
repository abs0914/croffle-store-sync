
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const approveRecipe = async (recipeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
      .update({
        approval_status: 'approved',
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', recipeId);

    if (error) throw error;

    // Enable the corresponding product in catalog
    const { data: recipe } = await supabase
      .from('recipes')
      .select('product_id')
      .eq('id', recipeId)
      .single();

    if (recipe?.product_id) {
      await supabase
        .from('product_catalog')
        .update({ is_available: true })
        .eq('id', recipe.product_id);
    }

    toast.success('Recipe approved - Product is now available in catalog');
    return true;
  } catch (error: any) {
    console.error('Error approving recipe:', error);
    toast.error('Failed to approve recipe');
    return false;
  }
};

export const rejectRecipe = async (recipeId: string, reason: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
      .update({
        approval_status: 'rejected',
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', recipeId);

    if (error) throw error;

    toast.success('Recipe rejected');
    return true;
  } catch (error: any) {
    console.error('Error rejecting recipe:', error);
    toast.error('Failed to reject recipe');
    return false;
  }
};
