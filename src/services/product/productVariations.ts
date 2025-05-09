
import { supabase } from "@/integrations/supabase/client";
import { ProductVariation, ProductSize } from "@/types";
import { toast } from "sonner";

// Create a product variation
export const createProductVariation = async (variation: {
  product_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
  sku: string;
  size: ProductSize;
}): Promise<ProductVariation | null> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .insert(variation)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity,
      product_id: data.product_id,
      productId: data.product_id,
      sku: data.sku,
      size: data.size as ProductSize
    };
  } catch (error) {
    console.error("Error creating product variation:", error);
    toast.error("Failed to create product variation");
    return null;
  }
};

// Update a product variation
export const updateProductVariation = async (id: string, variation: Partial<ProductVariation>): Promise<ProductVariation | null> => {
  try {
    // Format data for database update
    const dbVariation: any = {};
    if (variation.name !== undefined) dbVariation.name = variation.name;
    if (variation.price !== undefined) dbVariation.price = variation.price;
    if (variation.stock_quantity !== undefined) dbVariation.stock_quantity = variation.stock_quantity;
    else if (variation.stockQuantity !== undefined) dbVariation.stock_quantity = variation.stockQuantity;
    if (variation.is_active !== undefined) dbVariation.is_active = variation.is_active;
    else if (variation.isActive !== undefined) dbVariation.is_active = variation.isActive;
    if (variation.sku !== undefined) dbVariation.sku = variation.sku;
    if (variation.size !== undefined) dbVariation.size = variation.size;
    
    const { data, error } = await supabase
      .from("product_variations")
      .update(dbVariation)
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    return {
      id: data.id,
      name: data.name,
      price: data.price,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity,
      product_id: data.product_id,
      productId: data.product_id,
      sku: data.sku,
      size: data.size as ProductSize
    };
  } catch (error) {
    console.error("Error updating product variation:", error);
    toast.error("Failed to update product variation");
    return null;
  }
};

// Delete a product variation
export const deleteProductVariation = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("product_variations")
      .delete()
      .eq("id", id);
    
    if (error) throw new Error(error.message);
    
    return true;
  } catch (error) {
    console.error("Error deleting product variation:", error);
    toast.error("Failed to delete product variation");
    return false;
  }
};

// Fetch all variations for a product
export const fetchVariationsForProduct = async (productId: string): Promise<ProductVariation[]> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .order("name");
    
    if (error) throw new Error(error.message);
    
    return data?.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      is_active: item.is_active !== null ? item.is_active : true,
      isActive: item.is_active !== null ? item.is_active : true,
      stock_quantity: item.stock_quantity,
      stockQuantity: item.stock_quantity,
      product_id: item.product_id,
      productId: item.product_id,
      sku: item.sku,
      size: item.size as ProductSize
    })) || [];
  } catch (error) {
    console.error("Error fetching product variations:", error);
    toast.error("Failed to load product variations");
    return [];
  }
};
