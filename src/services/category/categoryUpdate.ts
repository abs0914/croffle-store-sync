
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types";
import { toast } from "sonner";

export const updateCategory = async (id: string, category: Partial<Category>): Promise<Category | null> => {
  try {
    // Prepare the data for database update
    const dbCategory: any = {};
    if (category.name !== undefined) dbCategory.name = category.name;
    if (category.description !== undefined) dbCategory.description = category.description;
    if (category.is_active !== undefined) dbCategory.is_active = category.is_active;
    else if (category.isActive !== undefined) dbCategory.is_active = category.isActive;
    
    const { data, error } = await supabase
      .from("categories")
      .update(dbCategory)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Category updated successfully");
    
    // Map the response back to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      image_url: data.image_url || undefined,
      image: data.image_url || undefined,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      store_id: data.store_id,
      storeId: data.store_id
    };
  } catch (error) {
    console.error("Error updating category:", error);
    toast.error("Failed to update category");
    return null;
  }
};
