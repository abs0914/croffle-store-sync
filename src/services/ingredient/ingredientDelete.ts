
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Delete an ingredient
export const deleteIngredient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Ingredient deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    toast.error("Failed to delete ingredient");
    return false;
  }
};
