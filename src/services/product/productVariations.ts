
import { supabase } from "@/integrations/supabase/client";
import { ProductVariation, ProductSize } from "@/types";
import { toast } from "sonner";

export const fetchProductVariations = async (productId: string): Promise<ProductVariation[]> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
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
      size: (item.size || 'regular') as ProductSize  // Cast to ProductSize
    })) || [];
  } catch (error) {
    console.error("Error fetching variations:", error);
    return [];
  }
};

export const createProductVariation = async (variation: Omit<ProductVariation, "id">): Promise<ProductVariation | null> => {
  try {
    // Prepare the data for database insertion
    const dbVariation = {
      name: variation.name,
      price: variation.price,
      stock_quantity: variation.stock_quantity || variation.stockQuantity || 0,
      is_active: variation.is_active !== undefined ? variation.is_active : (variation.isActive || true),
      product_id: variation.product_id || variation.productId,
      sku: variation.sku,
      size: variation.size || 'regular'  // Set default value if size is not provided
    };
    
    const { data, error } = await supabase
      .from("product_variations")
      .insert(dbVariation)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation added successfully");
    
    // Map the response back to our TypeScript interface
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
      size: (data.size || 'regular') as ProductSize  // Cast to ProductSize
    };
  } catch (error) {
    console.error("Error creating variation:", error);
    toast.error("Failed to add variation");
    return null;
  }
};

export const updateProductVariation = async (id: string, variation: Partial<ProductVariation>): Promise<ProductVariation | null> => {
  try {
    // Prepare the data for database update
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
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation updated successfully");
    
    // Map the response back to our TypeScript interface
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
      size: (data.size || 'regular') as ProductSize  // Cast to ProductSize
    };
  } catch (error) {
    console.error("Error updating variation:", error);
    toast.error("Failed to update variation");
    return null;
  }
};

export const deleteProductVariation = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("product_variations")
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Variation deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting variation:", error);
    toast.error("Failed to delete variation");
    return false;
  }
};
