
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";

export const updateProduct = async (id: string, product: Partial<Product>): Promise<Product | null> => {
  try {
    // Prepare the data for database update
    const dbProduct: any = {};
    if (product.name !== undefined) dbProduct.name = product.name;
    if (product.description !== undefined) dbProduct.description = product.description;
    if (product.sku !== undefined) dbProduct.sku = product.sku;
    if (product.barcode !== undefined) dbProduct.barcode = product.barcode;
    if (product.price !== undefined) dbProduct.price = product.price;
    if (product.cost !== undefined) dbProduct.cost = product.cost;
    if (product.stock_quantity !== undefined) dbProduct.stock_quantity = product.stock_quantity;
    else if (product.stockQuantity !== undefined) dbProduct.stock_quantity = product.stockQuantity;
    
    // Fix for UUID fields - ensure empty strings are converted to null
    // Also handle "uncategorized" special value
    if (product.category_id !== undefined) {
      dbProduct.category_id = product.category_id && product.category_id !== "uncategorized" ? product.category_id : null;
    } else if (product.categoryId !== undefined) {
      dbProduct.category_id = product.categoryId && product.categoryId !== "uncategorized" ? product.categoryId : null;
    }
    
    if (product.is_active !== undefined) dbProduct.is_active = product.is_active;
    else if (product.isActive !== undefined) dbProduct.is_active = product.isActive;
    if (product.image_url !== undefined) dbProduct.image_url = product.image_url;
    else if (product.image !== undefined) dbProduct.image_url = product.image;
    
    const { data, error } = await supabase
      .from("products")
      .update(dbProduct)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Product updated successfully");
    
    // Map the response back to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      category_id: data.category_id || undefined,
      categoryId: data.category_id || undefined,
      image_url: data.image_url || undefined,
      image: data.image_url || undefined,
      is_active: data.is_active !== null ? data.is_active : true,
      isActive: data.is_active !== null ? data.is_active : true,
      store_id: data.store_id,
      sku: data.sku,
      barcode: data.barcode || undefined,
      cost: data.cost || undefined,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error("Error updating product:", error);
    toast.error("Failed to update product");
    return null;
  }
};
