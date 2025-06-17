
import { supabase } from "@/integrations/supabase/client";
import { ProductCatalog, ProductIngredient } from "./types";
import { toast } from "sonner";

export const fetchProductCatalog = async (storeId: string): Promise<ProductCatalog[]> => {
  try {
    const { data, error } = await supabase
      .from('product_catalog')
      .select(`
        *,
        ingredients:product_ingredients(
          *,
          inventory_item:inventory_stock(*)
        )
      `)
      .eq('store_id', storeId)
      .order('display_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching product catalog:', error);
    toast.error('Failed to fetch product catalog');
    return [];
  }
};

export const createProduct = async (
  product: Omit<ProductCatalog, 'id' | 'created_at' | 'updated_at' | 'ingredients'>,
  ingredients: Omit<ProductIngredient, 'id' | 'product_catalog_id' | 'created_at'>[]
): Promise<ProductCatalog | null> => {
  try {
    const { data: productData, error: productError } = await supabase
      .from('product_catalog')
      .insert(product)
      .select()
      .single();

    if (productError) throw productError;

    if (ingredients.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('product_ingredients')
        .insert(
          ingredients.map(ing => ({
            ...ing,
            product_catalog_id: productData.id
          }))
        );

      if (ingredientsError) throw ingredientsError;
    }

    toast.success('Product created successfully');
    return productData;
  } catch (error) {
    console.error('Error creating product:', error);
    toast.error('Failed to create product');
    return null;
  }
};

export const updateProduct = async (
  id: string,
  updates: Partial<ProductCatalog>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_catalog')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    toast.success('Product updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    toast.error('Failed to update product');
    return false;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_catalog')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Product deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    toast.error('Failed to delete product');
    return false;
  }
};

export const toggleProductAvailability = async (
  id: string,
  isAvailable: boolean
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_catalog')
      .update({ is_available: isAvailable })
      .eq('id', id);

    if (error) throw error;

    toast.success(`Product ${isAvailable ? 'enabled' : 'disabled'} successfully`);
    return true;
  } catch (error) {
    console.error('Error updating product availability:', error);
    toast.error('Failed to update product availability');
    return false;
  }
};
