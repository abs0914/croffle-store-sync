
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";

export const fetchProducts = async (storeId: string): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories:category_id(id, name)
      `)
      .eq("store_id", storeId)
      .order("name");
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
    return data?.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      price: item.price,
      category_id: item.category_id || undefined,
      categoryId: item.category_id || undefined,
      image_url: item.image_url || undefined,
      image: item.image_url || undefined,
      is_active: item.is_active !== null ? item.is_active : true,
      isActive: item.is_active !== null ? item.is_active : true,
      store_id: item.store_id,
      storeId: item.store_id,
      sku: item.sku,
      barcode: item.barcode || undefined,
      cost: item.cost || undefined,
      stock_quantity: item.stock_quantity,
      stockQuantity: item.stock_quantity
    })) || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    toast.error("Failed to load products");
    return [];
  }
};

export const fetchProduct = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories:category_id(id, name)
      `)
      .eq("id", id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map database fields to our TypeScript interface
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
    console.error("Error fetching product:", error);
    toast.error("Failed to load product details");
    return null;
  }
};
