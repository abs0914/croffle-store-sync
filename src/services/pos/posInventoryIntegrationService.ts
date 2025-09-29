import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";
import { checkProductAvailabilityByRecipe } from "@/services/productCatalog/automaticAvailabilityService";
import { SimplifiedInventoryService } from "@/services/inventory/phase4InventoryService";

export interface POSInventoryStatus {
  productId: string;
  status: 'in_stock' | 'out_of_stock';
  availableQuantity: number;
  isDirectProduct: boolean;
}

// Simplified stock status - only show out of stock
const getStockStatus = (availableQuantity: number): 'in_stock' | 'out_of_stock' => {
  if (availableQuantity <= 0) return 'out_of_stock';
  return 'in_stock';
};

// Fetch inventory status for POS products with real inventory validation
export const fetchPOSInventoryStatus = async (
  products: Product[], 
  storeId: string
): Promise<Map<string, POSInventoryStatus>> => {
  const statusMap = new Map<string, POSInventoryStatus>();
  
  try {
    console.log(`🔍 POS Inventory: Validating inventory for ${products.length} products in store ${storeId}`);
    
    for (const product of products) {
      // Determine if this is a direct product or template-based
      const isDirectProduct = (product as any).product_type === 'direct' || 
                             !product.recipe_id ||
                             (!product.description?.includes('recipe') && 
                              (product.name.toLowerCase().includes('water') || 
                               product.name.toLowerCase().includes('drink') ||
                               product.name.toLowerCase().includes('bottle')));
      
      let availableQuantity = 0;
      let status: 'in_stock' | 'out_of_stock' = 'out_of_stock';
      
      if (isDirectProduct) {
        // For direct products, use the static stock quantity
        availableQuantity = product.stock_quantity || 0;
        status = getStockStatus(availableQuantity);
        console.log(`📦 Direct product ${product.name}: stock = ${availableQuantity}`);
      } else {
        // For recipe-based products, validate using direct recipe availability check
        try {
          // Check if product has sufficient inventory by querying recipe ingredients directly
          const { data: productData, error: productError } = await supabase
            .from('product_catalog')
            .select(`
              recipe_id,
              recipes!inner (
                id,
                is_active,
                recipe_ingredients (
                  quantity,
                  inventory_stock_id,
                  inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
                    id,
                    item,
                    stock_quantity
                  )
                )
              )
            `)
            .eq('id', product.id)
            .eq('store_id', storeId)
            .eq('is_available', true)
            .eq('recipes.is_active', true)
            .not('recipe_id', 'is', null)
            .maybeSingle();

          if (productError || !productData) {
            // No recipe found, assume available based on product availability flag
            status = (product.is_available !== false) ? 'in_stock' : 'out_of_stock';
            availableQuantity = status === 'in_stock' ? 25 : 0;
            console.log(`⚠️ Recipe product ${product.name}: no recipe data, using availability flag: ${status}`);
          } else {
            // Check if all ingredients have sufficient stock
            const recipe = productData.recipes;
            let hasStock = true;
            let minStock = Infinity;

            if (recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0) {
              for (const ingredient of recipe.recipe_ingredients) {
                if (ingredient.inventory_stock_id && ingredient.inventory_stock) {
                  const requiredQty = ingredient.quantity || 1;
                  const availableStock = ingredient.inventory_stock.stock_quantity || 0;
                  
                  if (availableStock < requiredQty) {
                    hasStock = false;
                    console.log(`❌ ${product.name}: insufficient ${ingredient.inventory_stock.item} (need: ${requiredQty}, have: ${availableStock})`);
                  } else {
                    const possibleQty = Math.floor(availableStock / requiredQty);
                    minStock = Math.min(minStock, possibleQty);
                  }
                }
              }
            }

            if (hasStock && minStock > 0) {
              status = 'in_stock';
              availableQuantity = Math.min(minStock, 50); // Cap at reasonable number
              console.log(`✅ Recipe product ${product.name}: sufficient stock, can make ${availableQuantity} units`);
            } else {
              status = 'out_of_stock';
              availableQuantity = 0;
              console.log(`❌ Recipe product ${product.name}: insufficient ingredients`);
            }
          }
        } catch (error) {
          // If validation fails, fallback to product availability flag
          status = (product.is_available !== false) ? 'in_stock' : 'out_of_stock';
          availableQuantity = status === 'in_stock' ? 1 : 0;
          console.log(`❌ Recipe product ${product.name}: validation error, using fallback`, error);
        }
      }
      
      statusMap.set(product.id, {
        productId: product.id,
        status,
        availableQuantity,
        isDirectProduct
      });
      
      console.log(`✅ Product ${product.name}: ${status} (${availableQuantity} available)`);
    }

  } catch (error) {
    console.error('❌ Error in fetchPOSInventoryStatus:', error);
    
    // Fallback: return safe defaults for all products
    products.forEach(product => {
      const fallbackQuantity = (product.is_available !== false) ? 1 : 0;
      statusMap.set(product.id, {
        productId: product.id,
        status: getStockStatus(fallbackQuantity),
        availableQuantity: fallbackQuantity,
        isDirectProduct: false
      });
    });
  }

  console.log(`🎯 POS Inventory: Status calculated for ${statusMap.size} products`);
  return statusMap;
};

// Real-time inventory status updates for POS
export const setupPOSInventoryListener = (
  storeId: string,
  onInventoryUpdate: (updates: Map<string, POSInventoryStatus>) => void
) => {
  const channel = supabase
    .channel('pos-inventory-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `store_id=eq.${storeId}`
      },
      (payload) => {
        console.log('POS: Product inventory updated', payload);
        // This would trigger a refresh in the consuming component
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};