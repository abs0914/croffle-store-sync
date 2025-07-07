
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";

export const fetchProducts = async (storeId: string): Promise<Product[]> => {
  try {
    console.log("fetchProducts: Starting fetch for store:", storeId);
    
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:category_id(id, name, is_active, image_url, description)
      `)
      .eq("store_id", storeId)
      .order("name");
    
    if (error) {
      console.error("fetchProducts: Supabase error:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log("fetchProducts: Raw data received:", {
      count: data?.length || 0,
      sample: data?.[0],
      storeId
    });
    
    if (!data || data.length === 0) {
      console.warn("fetchProducts: No products found for store:", storeId);
      return [];
    }
    
    // Map database fields to our TypeScript interface
    const mappedProducts = data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || undefined,
      price: item.price,
      category_id: item.category_id || undefined,
      categoryId: item.category_id || undefined,
      category: item.category ? {
        id: item.category.id,
        name: item.category.name,
        is_active: item.category.is_active !== null ? item.category.is_active : true,
        isActive: item.category.is_active !== null ? item.category.is_active : true,
        image_url: item.category.image_url || undefined,
        image: item.category.image_url || undefined,
        description: item.category.description || undefined,
        store_id: storeId, // Since we're filtering by storeId, this is the store_id
        storeId: storeId // For frontend compatibility
      } : undefined,
      image_url: item.image_url || undefined,
      image: item.image_url || undefined,
      is_active: item.is_active !== null ? item.is_active : true, // Ensure is_active has a default value of true
      isActive: item.is_active !== null ? item.is_active : true, // Ensure isActive has a default value of true
      store_id: item.store_id,
      storeId: item.store_id,
      sku: item.sku,
      barcode: item.barcode || undefined,
      cost: item.cost || undefined,
      stock_quantity: item.stock_quantity,
      stockQuantity: item.stock_quantity
    }));
    
    console.log("fetchProducts: Mapped products:", {
      count: mappedProducts.length,
      sampleProduct: mappedProducts[0]
    });
    
    return mappedProducts;
  } catch (error) {
    console.error("fetchProducts: Error occurred:", error);
    
    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('JWT')) {
        toast.error("Authentication error. Please log in again.");
      } else if (error.message.includes('permission')) {
        toast.error("Permission denied. Check your store access.");
      } else {
        toast.error(`Failed to load products: ${error.message}`);
      }
    } else {
      toast.error("Failed to load products");
    }
    
    return [];
  }
};

export const fetchProduct = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        category:category_id(id, name, is_active, image_url, description)
      `)
      .eq("id", id)
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Get the store_id for use in the category object
    const storeId = data.store_id;

    // Map database fields to our TypeScript interface
    return {
      id: data.id,
      name: data.name,
      description: data.description || undefined,
      price: data.price,
      category_id: data.category_id || undefined,
      categoryId: data.category_id || undefined,
      category: data.category ? {
        id: data.category.id,
        name: data.category.name,
        is_active: data.category.is_active !== null ? data.category.is_active : true,
        isActive: data.category.is_active !== null ? data.category.is_active : true,
        image_url: data.category.image_url || undefined,
        image: data.category.image_url || undefined,
        description: data.category.description || undefined,
        store_id: storeId,
        storeId: storeId
      } : undefined,
      image_url: data.image_url || undefined,
      image: data.image_url || undefined,
      is_active: data.is_active !== null ? data.is_active : true, // Ensure is_active has a default value of true
      isActive: data.is_active !== null ? data.is_active : true, // Ensure isActive has a default value of true
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
