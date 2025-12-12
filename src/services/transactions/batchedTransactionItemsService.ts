/**
 * BATCHED TRANSACTION ITEMS SERVICE
 * 
 * Optimized version that eliminates N+1 queries by:
 * - Fetching all product categories in a single batch query
 * - Expanding all combo products in parallel
 * - Using cached data when available
 */

import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types";
import { extractBaseProductName } from "@/utils/productNameUtils";

export interface DetailedTransactionItem {
  product_id: string;
  variation_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category_id?: string;
  category_name?: string;
  product_type: string;
}

interface ProductCategoryInfo {
  id: string;
  product_name: string;
  category_id: string | null;
  price: number;
  categories: { id: string; name: string } | null;
}

// In-memory cache for product data (survives within transaction context)
const productCache = new Map<string, ProductCategoryInfo>();
const CACHE_TTL = 60000; // 1 minute
let cacheTimestamp = 0;

/**
 * Enriches cart items with category information using BATCHED queries
 * Eliminates N+1 query pattern
 */
export const batchEnrichCartItems = async (items: CartItem[]): Promise<DetailedTransactionItem[]> => {
  console.log(`🚀 BATCH ENRICH: Processing ${items.length} items`);
  const startTime = Date.now();

  // Separate combo and regular items
  const comboItems = items.filter(item => item.productId.startsWith('combo-'));
  const regularItems = items.filter(item => !item.productId.startsWith('combo-'));

  // Collect all product IDs we need (including combo components)
  const allProductIds = new Set<string>();
  
  // Add regular product IDs
  regularItems.forEach(item => allProductIds.add(item.productId));
  
  // Parse combo IDs to get component IDs
  const comboComponentMap = new Map<string, { croffleId: string; espressoId: string }>();
  for (const item of comboItems) {
    const componentIds = parseComboId(item.productId);
    if (componentIds) {
      comboComponentMap.set(item.productId, componentIds);
      allProductIds.add(componentIds.croffleId);
      allProductIds.add(componentIds.espressoId);
    }
  }

  // SINGLE BATCH QUERY for all products
  const productIds = Array.from(allProductIds);
  if (productIds.length > 0) {
    await batchFetchProducts(productIds);
  }

  const enrichedItems: DetailedTransactionItem[] = [];

  // Process regular items using cached data
  for (const item of regularItems) {
    const product = productCache.get(item.productId);
    const itemName = item.variation 
      ? `${extractBaseProductName(item.product.name)} (${item.variation.name})`
      : extractBaseProductName(product?.product_name || item.product.name);

    enrichedItems.push({
      product_id: item.productId,
      variation_id: item.variationId || undefined,
      name: itemName,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
      category_id: product?.category_id || undefined,
      category_name: product?.categories?.name || undefined,
      product_type: item.variationId ? 'variation' : 'regular'
    });
  }

  // Process combo items using cached data
  for (const item of comboItems) {
    const componentIds = comboComponentMap.get(item.productId);
    if (!componentIds) {
      // Fallback for invalid combo
      enrichedItems.push(createFallbackItem(item));
      continue;
    }

    const croffleProduct = productCache.get(componentIds.croffleId);
    const espressoProduct = productCache.get(componentIds.espressoId);

    // Calculate proportional prices
    const crofflePrice = croffleProduct?.price || 0;
    const espressoPrice = espressoProduct?.price || 0;
    const totalComboPrice = item.price * item.quantity;
    const totalOriginalPrice = crofflePrice + espressoPrice;
    const croffleProportionalPrice = totalOriginalPrice > 0 
      ? (crofflePrice / totalOriginalPrice) * totalComboPrice 
      : totalComboPrice / 2;
    const espressoProportionalPrice = totalComboPrice - croffleProportionalPrice;

    if (croffleProduct) {
      enrichedItems.push({
        product_id: componentIds.croffleId,
        variation_id: undefined,
        name: `${croffleProduct.product_name} (from ${item.product.name})`,
        quantity: item.quantity,
        unit_price: croffleProportionalPrice / item.quantity,
        total_price: croffleProportionalPrice,
        category_id: croffleProduct.category_id || undefined,
        category_name: croffleProduct.categories?.name || undefined,
        product_type: 'combo_component'
      });
    }

    if (espressoProduct) {
      enrichedItems.push({
        product_id: componentIds.espressoId,
        variation_id: undefined,
        name: `${espressoProduct.product_name} (from ${item.product.name})`,
        quantity: item.quantity,
        unit_price: espressoProportionalPrice / item.quantity,
        total_price: espressoProportionalPrice,
        category_id: espressoProduct.category_id || undefined,
        category_name: espressoProduct.categories?.name || undefined,
        product_type: 'combo_component'
      });
    }
  }

  console.log(`✅ BATCH ENRICH: Completed in ${Date.now() - startTime}ms for ${enrichedItems.length} items`);
  return enrichedItems;
};

/**
 * Batch fetch products with categories - SINGLE QUERY
 */
async function batchFetchProducts(productIds: string[]): Promise<void> {
  // Check cache freshness
  const now = Date.now();
  if (now - cacheTimestamp > CACHE_TTL) {
    productCache.clear();
    cacheTimestamp = now;
  }

  // Filter out already cached products
  const uncachedIds = productIds.filter(id => !productCache.has(id));
  
  if (uncachedIds.length === 0) {
    console.log('📦 BATCH FETCH: All products in cache');
    return;
  }

  console.log(`📥 BATCH FETCH: Fetching ${uncachedIds.length} products in single query`);

  const { data: products, error } = await supabase
    .from('product_catalog')
    .select(`
      id,
      product_name,
      category_id,
      price,
      categories (id, name)
    `)
    .in('id', uncachedIds);

  if (error) {
    console.warn('⚠️ BATCH FETCH: Error fetching products:', error);
    return;
  }

  // Cache the results
  for (const product of products || []) {
    productCache.set(product.id, product as ProductCategoryInfo);
  }

  console.log(`✅ BATCH FETCH: Cached ${products?.length || 0} products`);
}

/**
 * Parse combo product ID into component IDs
 */
function parseComboId(comboId: string): { croffleId: string; espressoId: string } | null {
  const parts = comboId.split('-');
  if (parts.length !== 11) return null;

  const croffleId = `${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}-${parts[5]}`;
  const espressoId = `${parts[6]}-${parts[7]}-${parts[8]}-${parts[9]}-${parts[10]}`;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(croffleId) || !uuidRegex.test(espressoId)) return null;

  return { croffleId, espressoId };
}

/**
 * Create fallback item for invalid combos
 */
function createFallbackItem(item: CartItem): DetailedTransactionItem {
  return {
    product_id: '00000000-0000-0000-0000-000000000000',
    variation_id: undefined,
    name: item.product.name,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
    category_id: undefined,
    category_name: 'Combo',
    product_type: 'combo'
  };
}

/**
 * Clear the product cache (call when product data changes)
 */
export function clearProductCache(): void {
  productCache.clear();
  cacheTimestamp = 0;
}
