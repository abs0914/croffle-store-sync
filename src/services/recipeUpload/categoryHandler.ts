
import { supabase } from "@/integrations/supabase/client";

export const handleCategoryCreation = async (
  categoryName: string | undefined,
  storeId: string,
  categoryMap: Map<string, any>
): Promise<string | undefined> => {
  if (!categoryName) return undefined;

  const existingCategory = categoryMap.get(categoryName.toLowerCase());
  if (existingCategory) {
    return existingCategory.id;
  }

  // Create new category
  const { data: newCategory, error: categoryError } = await supabase
    .from('categories')
    .insert({
      name: categoryName,
      description: `Category for ${categoryName} items`,
      store_id: storeId,
      is_active: true
    })
    .select()
    .single();

  if (categoryError) {
    console.error(`Error creating category ${categoryName}:`, categoryError);
    return undefined;
  }

  categoryMap.set(categoryName.toLowerCase(), newCategory);
  return newCategory.id;
};
