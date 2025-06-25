
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types";
import { toast } from "sonner";

export const createCategory = async (category: Omit<Category, "id">): Promise<Category | null> => {
  try {
    // Prepare the data for database insertion
    const dbCategory = {
      name: category.name,
      description: category.description || null,
      is_active: category.is_active !== undefined ? category.is_active : category.isActive,
      store_id: category.store_id || category.storeId
    };
    
    const { data, error } = await supabase
      .from("categories")
      .insert(dbCategory)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Category created successfully");
    
    // Map the response back to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      image_url: data.image_url || undefined,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      store_id: data.store_id,
      storeId: data.store_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error("Error creating category:", error);
    toast.error("Failed to create category");
    return null;
  }
};
