
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { toast } from "sonner";
import { enhanceProductsWithCategories } from "@/services/pos/categoryMappingService";

export const fetchProductCatalogForPOS = async (storeId: string): Promise<Product[]> => {
  try {
    console.log('🔍 fetchProductCatalogForPOS: Starting fetch for store:', storeId);
    
    // Fetch products with recipe template images (centralized approach)
    let { data, error } = await supabase
      .from("product_catalog")
      .select(`
        id, 
        product_name, 
        description, 
        price, 
        category_id, 
        store_id, 
        image_url, 
        is_available, 
        product_status, 
        recipe_id,
        recipe_templates!inner(image_url)
      `)
      .eq("store_id", storeId)
      .order("display_order", { ascending: true });

    // If that fails (likely RLS issue with join), fall back to simple query
    if (error) {
      console.warn('fetchProductCatalogForPOS: falling back to simple query:', error);
      const { data: simpleData, error: simpleError } = await supabase
        .from("product_catalog")
        .select("id, product_name, description, price, category_id, store_id, image_url, is_available, product_status, recipe_id")
        .eq("store_id", storeId)
        .order("display_order", { ascending: true });
      
      data = simpleData as any;
      error = simpleError as any;
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
    const mappedProducts: Product[] = (data?.map(item => {
      // Get recipe template image URL if available (centralized approach)
      const recipeImageUrl = (item as any).recipe_templates?.image_url;
      const effectiveImageUrl = recipeImageUrl || item.image_url;
      
      return {
        id: item.id,
        name: item.product_name,
        description: item.description || undefined,
        price: item.price,
        category_id: item.category_id || undefined,
        categoryId: item.category_id || undefined,
        category: (item as any).category || undefined,
        image_url: effectiveImageUrl || undefined, // Prioritize recipe template image
        image: effectiveImageUrl || undefined, // Map to frontend compatibility field
        is_active: item.is_available,
        isActive: item.is_available,
        product_status: item.product_status as any,
        store_id: item.store_id,
        storeId: item.store_id,
        sku: `PC-${item.id.substring(0, 8)}` as string,
        barcode: undefined,
        cost: undefined,
        stock_quantity: 100,
        stockQuantity: 100,
        variations: [],
        recipe_id: item.recipe_id || null,
        product_type: (item.recipe_id ? 'recipe' : 'direct') as 'recipe' | 'direct'
      };
    }) as Product[]) || [];

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
