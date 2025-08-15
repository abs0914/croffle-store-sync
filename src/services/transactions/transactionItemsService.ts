import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types";

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

/**
 * Enriches cart items with category information for transaction items
 */
export const enrichCartItemsWithCategories = async (items: CartItem[]): Promise<DetailedTransactionItem[]> => {
  const enrichedItems: DetailedTransactionItem[] = [];
  
  for (const item of items) {
    try {
      // Fetch product with category information
      const { data: product, error } = await supabase
        .from('product_catalog')
        .select(`
          id,
          product_name,
          category_id,
          categories (
            id,
            name
          )
        `)
        .eq('id', item.productId)
        .single();

      if (error) {
        console.warn('Failed to fetch product category for:', item.productId, error);
      }

      const enrichedItem: DetailedTransactionItem = {
        product_id: item.productId,
        variation_id: item.variationId || undefined,
        name: item.variation ? `${item.product.name} (${item.variation.name})` : (product?.product_name || item.product.name),
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        category_id: product?.category_id || undefined,
        category_name: product?.categories?.name || undefined,
        product_type: item.variationId ? 'variation' : 'regular'
      };

      enrichedItems.push(enrichedItem);
    } catch (error) {
      console.warn('Error enriching cart item:', error);
      // Fallback to basic item structure
      enrichedItems.push({
        product_id: item.productId,
        variation_id: item.variationId || undefined,
        name: item.variation ? `${item.product.name} (${item.variation.name})` : item.product.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        product_type: item.variationId ? 'variation' : 'regular'
      });
    }
  }

  return enrichedItems;
};

/**
 * Inserts transaction items into the database
 */
export const insertTransactionItems = async (transactionId: string, items: DetailedTransactionItem[]): Promise<void> => {
  if (items.length === 0) return;

  const itemsWithTransactionId = items.map(item => ({
    ...item,
    transaction_id: transactionId
  }));

  const { error } = await supabase
    .from("transaction_items")
    .insert(itemsWithTransactionId);

  if (error) {
    console.error('Failed to insert transaction items:', error);
    throw new Error('Failed to save transaction items');
  }
};