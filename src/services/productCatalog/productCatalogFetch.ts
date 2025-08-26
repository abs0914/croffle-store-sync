
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";
import { enhanceProductsWithCategories } from "@/services/pos/categoryMappingService";

export const fetchProductCatalogForPOS = async (storeId: string): Promise<Product[]> => {
  try {
    console.log('🔍 fetchProductCatalogForPOS: Starting fetch for store:', storeId);
    
    // Try a safe select without cross-table joins (avoids RLS failures)
    let { data, error } = await supabase
      .from("product_catalog")
      .select(`
        id, product_name, description, price, category_id, store_id, image_url, is_available, product_status, recipe_id,
        ingredients:product_ingredients(
          *,
          inventory_item:inventory_stock(*)
        )
      `)
      .eq("store_id", storeId)
      // Remove is_available filter to include products marked unavailable by automatic service
      // We'll filter in the UI based on product_status and is_available together
      .order("display_order", { ascending: true });

    // If that fails for any reason, attempt a minimal fallback query
    if (error) {
      console.warn('fetchProductCatalogForPOS: falling back to minimal query due to error:', error);
      const minimal = await supabase
        .from("product_catalog")
        .select("id, product_name, description, price, category_id, store_id, image_url, is_available, product_status, recipe_id")
        .eq("store_id", storeId)
        .eq("is_available", true)
        .order("display_order", { ascending: true });
      data = minimal.data as any;
      error = minimal.error as any;
    }
    
    console.log('🔍 fetchProductCatalogForPOS: Query result:', { 
      dataCount: data?.length, 
      error,
      storeId,
      sampleData: data?.slice(0, 2).map(item => ({ 
        name: item.product_name, 
        category_id: item.category_id,
        is_available: item.is_available 
      }))
    });
    
    if (error) {
      console.error('🔍 fetchProductCatalogForPOS: Supabase error:', error);
      throw new Error(error.message);
    }
    
    if (!data || data.length === 0) {
      console.log('🔍 fetchProductCatalogForPOS: No products found for store:', storeId);
      return [];
    }
    
    // Map product_catalog data to Product interface for POS compatibility
    const mappedProducts: Product[] = (data?.map(item => ({
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
      sku: `PC-${item.id.substring(0, 8)}` as string, // Generate SKU from ID
      barcode: undefined,
      cost: undefined,
      stock_quantity: 100, // Default stock for now since product_catalog doesn't track stock
      stockQuantity: 100,
      variations: [], // Product catalog doesn't have variations yet
      recipe_id: item.recipe_id || null,
      product_type: (item.recipe_id ? 'recipe' : 'direct') as 'recipe' | 'direct'
    })) as Product[]) || [];

    // Only enhance products that don't already have a category_id from database
    const productsNeedingEnhancement = mappedProducts.filter(p => !p.category_id);
    const productsWithCategories = mappedProducts.filter(p => p.category_id);

    console.log(`Using database categories for ${productsWithCategories.length} products`);
    console.log(`Enhancing ${productsNeedingEnhancement.length} products without categories`);

    // Enhance only products without category_id, but never block rendering if this fails
    let enhancedProducts: Product[] = [] as any;
    try {
      enhancedProducts = productsNeedingEnhancement.length > 0 
        ? await enhanceProductsWithCategories(productsNeedingEnhancement, storeId)
        : [];
    } catch (enhanceError) {
      console.warn('fetchProductCatalogForPOS: category enhancement failed, continuing without it:', enhanceError);
      enhancedProducts = [] as any;
    }

    // Combine products with database categories and enhanced products
    const allProducts = [...productsWithCategories, ...enhancedProducts];

    console.log('Final products with categories:', allProducts.map(p => ({ name: p.name, category_id: p.category_id, category: p.category })));
    return allProducts;
  } catch (error) {
    console.error("Error fetching product catalog for POS:", error);
    toast.error("Failed to load products");
    return [];
  }
};
