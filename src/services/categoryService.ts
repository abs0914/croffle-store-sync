
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types";
import { toast } from "sonner";

export const fetchCategories = async (storeId: string): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    return data?.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      image_url: item.image_url || undefined,
      image: item.image_url || undefined, // For frontend compatibility
      is_active: item.is_active !== null ? item.is_active : true,
      isActive: item.is_active !== null ? item.is_active : true, // For frontend compatibility
      store_id: item.store_id,
      storeId: item.store_id // For frontend compatibility
    })) || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    toast.error("Failed to load categories");
    return [];
  }
};

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
      image: data.image_url || undefined, 
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      store_id: data.store_id,
      storeId: data.store_id
    };
  } catch (error) {
    console.error("Error creating category:", error);
    toast.error("Failed to create category");
    return null;
  }
};

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

export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Category deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    toast.error("Failed to delete category");
    return false;
  }
};
