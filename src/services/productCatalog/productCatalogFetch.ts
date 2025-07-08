
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";

export const fetchProductCatalogForPOS = async (storeId: string): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from("product_catalog")
      .select(`
        *,
        ingredients:product_ingredients(
          *,
          inventory_item:inventory_stock(*)
        )
      `)
      .eq("store_id", storeId)
      .eq("is_available", true)
      .order("display_order", { ascending: true });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Map product_catalog data to Product interface for POS compatibility
    return data?.map(item => ({
      id: item.id,
      name: item.product_name,
      description: item.description || undefined,
      price: item.price,
      category_id: undefined, // Product catalog doesn't use categories yet
      categoryId: undefined,
      category: undefined,
      image_url: item.image_url || undefined, // Include image_url from product_catalog
      image: item.image_url || undefined, // Map to frontend compatibility field
      is_active: item.is_available,
      isActive: item.is_available,
      product_status: item.product_status as any, // Include enhanced status
      store_id: item.store_id,
      storeId: item.store_id,
      sku: `PC-${item.id.substring(0, 8)}`, // Generate SKU from ID
      barcode: undefined,
      cost: undefined,
      stock_quantity: 100, // Default stock for now since product_catalog doesn't track stock
      stockQuantity: 100,
      variations: [] // Product catalog doesn't have variations yet
    })) || [];
  } catch (error) {
    console.error("Error fetching product catalog for POS:", error);
    toast.error("Failed to load products");
    return [];
  }
};
