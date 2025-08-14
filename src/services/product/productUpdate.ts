
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";
import { unifiedProductService } from "./unifiedProductService";

export const updateProduct = async (id: string, product: Partial<Product>): Promise<Product | null> => {
  try {
    // Use unified service for consistent updates across both tables
    const result = await unifiedProductService.updateFromProductsTable(id, product);
    
    if (!result.success) {
      throw new Error(result.error || 'Update failed');
    }

    console.log('✅ Product update result:', {
      productCatalogUpdated: result.productCatalogUpdated,
      productsTableUpdated: result.productsTableUpdated
    });

    // Get the updated product data for return
    const { data, error } = await supabase
      .from("products")
      .select()
      .eq("id", id)
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
      storeId: data.store_id,
      sku: data.sku,
      barcode: data.barcode || undefined,
      cost: data.cost || undefined,
      stock_quantity: data.stock_quantity,
      stockQuantity: data.stock_quantity
    };
  } catch (error) {
    console.error("Error updating product:", error);
    toast.error("Failed to update product");
    return null;
  }
};
