
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
