
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories } from "./categoryFetch";
import { deleteCategory } from "./categoryDelete";
import { toast } from "sonner";

/**
 * Delete a category by name
 * @param storeId - The store ID
 * @param categoryName - The name of the category to delete
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export const deleteCategoryByName = async (storeId: string, categoryName: string): Promise<boolean> => {
  try {
    // First, fetch all categories to find the one with the matching name
    const categories = await fetchCategories(storeId);
    
    // Find the category with the specified name
    const categoryToDelete = categories.find(
      category => category.name.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (!categoryToDelete) {
      console.log(`Category "${categoryName}" not found`);
      return false;
    }
    
    // Use the existing deleteCategory function to remove it
    const result = await deleteCategory(categoryToDelete.id);
    
    if (result) {
      console.log(`Category "${categoryName}" deleted successfully`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error deleting category "${categoryName}":`, error);
    toast.error(`Failed to delete category "${categoryName}"`);
    return false;
  }
};
