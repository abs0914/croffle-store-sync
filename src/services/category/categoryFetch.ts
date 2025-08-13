
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types";

import { sortCategoriesForPOS } from "@/utils/categoryOrdering";

export const fetchCategories = async (storeId: string): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true);
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    const categories = data?.map(item => ({
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

    // Apply custom POS ordering
    return sortCategoriesForPOS(categories);
  } catch (error) {
    console.warn("fetchCategories: Failed to load categories, returning empty list.", { storeId, error });
    return [];
  }
};
