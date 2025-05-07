
import { supabase } from "@/integrations/supabase/client";
import { Category } from "@/types";
import { toast } from "sonner";

// Fetch categories
export async function fetchCategories(storeId: string) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name');
      
    if (error) throw error;
    
    const categories: Category[] = data.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      image: item.image || undefined,
      isActive: item.is_active,
    }));
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

// Create or update a category
export async function saveCategory(category: Category, storeId: string) {
  try {
    const categoryData = {
      name: category.name,
      description: category.description || null,
      image: category.image || null,
      is_active: category.isActive,
      store_id: storeId,
    };

    if (category.id) {
      // Update existing category
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', category.id);
        
      if (error) throw error;
      
      return category.id;
    } else {
      // Create new category
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select('id')
        .single();
        
      if (error) throw error;
      
      return data.id;
    }
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
}
