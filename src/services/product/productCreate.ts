
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";

export const createProduct = async (product: Omit<Product, "id">): Promise<Product | null> => {
  try {
    // Prepare the data for database insertion
    const dbProduct = {
      name: product.name,
      description: product.description || null,
      sku: product.sku,
      barcode: product.barcode || null,
      price: product.price,
      cost: product.cost || null,
      stock_quantity: product.stock_quantity || product.stockQuantity || 0,
      category_id: product.category_id || product.categoryId || null,
      is_active: product.is_active !== undefined ? product.is_active : (product.isActive || true),
      image_url: product.image_url || product.image || null,
      store_id: product.store_id || product.storeId,
      product_type: product.product_type || 'recipe',
      inventory_stock_id: product.inventory_stock_id || null,
      selling_quantity: product.selling_quantity || 1,
      recipe_id: product.recipe_id || null,
    };
    
    const { data, error } = await supabase
      .from("products")
      .insert(dbProduct)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Product created successfully");
    
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
      storeId: data.store_id,
      sku: data.sku,
      barcode: data.barcode || undefined,
      cost: data.cost || undefined,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity,
      product_type: (data as any).product_type || 'recipe',
      inventory_stock_id: (data as any).inventory_stock_id || null,
      selling_quantity: (data as any).selling_quantity || 1,
      recipe_id: (data as any).recipe_id || null,
    };
  } catch (error) {
    console.error("Error creating product:", error);
    toast.error("Failed to create product");
    return null;
  }
};
