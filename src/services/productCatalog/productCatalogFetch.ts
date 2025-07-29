
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";
import { enhanceProductsWithCategories } from "@/services/pos/categoryMappingService";

export const fetchProductCatalogForPOS = async (storeId: string): Promise<Product[]> => {
  try {
    console.log('🔍 fetchProductCatalogForPOS: Starting fetch for store:', storeId);
    
    const { data, error } = await supabase
      .from("product_catalog")
      .select(`
        *,
        ingredients:product_ingredients(
          *,
          inventory_item:inventory_stock(*)
        ),
        category:categories(
          id,
          name
        )
      `)
      .eq("store_id", storeId)
      .eq("is_available", true)
      .order("display_order", { ascending: true });
    
    console.log('🔍 fetchProductCatalogForPOS: Query result:', { dataCount: data?.length, error });
    
    if (error) {
      console.error('🔍 fetchProductCatalogForPOS: Supabase error:', error);
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      console.log('🔍 fetchProductCatalogForPOS: No products found for store:', storeId);
      return [];
    }
    
    // Map product_catalog data to Product interface for POS compatibility
    const mappedProducts = data?.map(item => ({
      id: item.id,
      name: item.product_name,
      description: item.description || undefined,
      price: item.price,
      category_id: item.category_id || undefined,
      categoryId: item.category_id || undefined,
      category: (item as any).category || undefined,
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
      variations: [], // Product catalog doesn't have variations yet
      recipe_id: item.recipe_id || null,
      product_type: item.recipe_id ? 'recipe' : 'direct'
    })) || [];

    // Only enhance products that don't already have a category_id from database
    const productsNeedingEnhancement = mappedProducts.filter(p => !p.category_id);
    const productsWithCategories = mappedProducts.filter(p => p.category_id);

    console.log(`Using database categories for ${productsWithCategories.length} products`);
    console.log(`Enhancing ${productsNeedingEnhancement.length} products without categories`);

    // Enhance only products without category_id
    const enhancedProducts = productsNeedingEnhancement.length > 0 
      ? await enhanceProductsWithCategories(productsNeedingEnhancement, storeId)
      : [];

    // Combine products with database categories and enhanced products
    const allProducts = [...productsWithCategories, ...enhancedProducts];

    console.log('Final products with categories:', allProducts.map(p => ({ name: p.name, category_id: p.category_id, category_name: p.category?.name })));
    return allProducts;
  } catch (error) {
    console.error("Error fetching product catalog for POS:", error);
    toast.error("Failed to load products");
    return [];
  }
};
