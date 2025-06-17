
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";

export const createOrUpdateProduct = async (
  recipe: RecipeUpload,
  storeId: string,
  categoryId: string | undefined
): Promise<string> => {
  // Check if a product with this name already exists
  const { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .eq('name', recipe.name)
    .eq('is_active', true)
    .maybeSingle();

  if (existingProduct) {
    // Update existing product with category if provided
    if (categoryId) {
      await supabase
        .from('products')
        .update({ category_id: categoryId })
        .eq('id', existingProduct.id);
    }
    return existingProduct.id;
  }

  // Create a new product for this recipe
  const { data: newProduct, error: productError } = await supabase
    .from('products')
    .insert({
      name: recipe.name,
      description: recipe.description || `Product for ${recipe.name}`,
      price: 0, // Will be calculated from recipe cost
      cost: 0, // Will be calculated from recipe ingredients
      stock_quantity: 0,
      store_id: storeId,
      category_id: categoryId,
      sku: `RECIPE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      is_active: true
    })
    .select()
    .single();

  if (productError) {
    throw new Error(`Error creating product for recipe ${recipe.name}: ${productError.message}`);
  }

  return newProduct.id;
};
