
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductVariation, ProductSize } from "@/types";
import { toast } from "sonner";

// Re-export functions from separate product service files
export * from './product/productCore';
export * from './product/productVariations';
export * from './product/productImportExport';
export * from './product/productInventory';
export * from './product/productImages';

// Fetch product variations
export const fetchProductVariations = async (productId: string): Promise<ProductVariation[]> => {
  try {
    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("price");
    
    if (error) throw new Error(error.message);
    
    // Convert string sizes to ProductSize enum
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
      size: item.size as ProductSize // Cast to ProductSize
    })) || [];
  } catch (error) {
    console.error("Error fetching product variations:", error);
    toast.error("Failed to load product variations");
    return [];
  }
};

// Create inventory transaction
export const createInventoryTransaction = async (transactionData: any) => {
  try {
    const { data, error } = await supabase
      .from("inventory_transactions")
      .insert(transactionData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    return data;
  } catch (error) {
    console.error("Error creating inventory transaction:", error);
    toast.error("Failed to record inventory transaction");
    return null;
  }
};

// Upload product image
export const uploadProductImage = async (file: File): Promise<string | undefined> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;
    
    const { error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);
    
    if (error) throw error;
    
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    toast.error("Failed to upload image");
    return undefined;
  }
};
