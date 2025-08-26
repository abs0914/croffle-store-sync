import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types";

export interface POSInventoryStatus {
  productId: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  availableQuantity: number;
  isDirectProduct: boolean;
}

// Determine stock status based on available quantity
const getStockStatus = (stockQuantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= 5) return 'low_stock';
  return 'in_stock';
};

// Fetch inventory status for POS products
export const fetchPOSInventoryStatus = async (
  products: Product[], 
  storeId: string
): Promise<Map<string, POSInventoryStatus>> => {
  const statusMap = new Map<string, POSInventoryStatus>();
  
  try {
    // For now, we'll determine direct products based on product_type if available,
    // or use a simple heuristic based on existing data
    products.forEach(product => {
      // Check if product has product_type field or use heuristic
      const isDirectProduct = (product as any).product_type === 'direct' || 
                             (!product.description?.includes('recipe') && 
                              (product.name.toLowerCase().includes('water') || 
                               product.name.toLowerCase().includes('drink') ||
                               product.name.toLowerCase().includes('bottle')));
      
      const stockQuantity = product.stock_quantity || 0;
      
      statusMap.set(product.id, {
        productId: product.id,
        status: getStockStatus(stockQuantity),
        availableQuantity: stockQuantity,
        isDirectProduct
      });
    });

  } catch (error) {
    console.error('Error in fetchPOSInventoryStatus:', error);
    
    // Fallback: return safe defaults for all products
    products.forEach(product => {
      statusMap.set(product.id, {
        productId: product.id,
        status: product.stock_quantity > 0 ? 'in_stock' : 'out_of_stock',
        availableQuantity: product.stock_quantity || 0,
        isDirectProduct: false
      });
    });
  }

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