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

/**
 * Enriches cart items with category information for transaction items
 */
export const enrichCartItemsWithCategories = async (items: CartItem[]): Promise<DetailedTransactionItem[]> => {
  const enrichedItems: DetailedTransactionItem[] = [];
  
  for (const item of items) {
    try {
    // Check if this is a combo product
    if (item.productId.startsWith('combo_')) {
        console.log('🔧 Processing combo item:', item.productId, item.product.name);
        
        // Handle combo product - expand into component items
        const comboItems = await expandComboProduct(item);
        enrichedItems.push(...comboItems);
        continue;
      }

      // Regular product processing
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

      // Use clean base product name for consistent inventory processing
      const itemName = item.variation ? 
        `${extractBaseProductName(item.product.name)} (${item.variation.name})` : 
        extractBaseProductName(product?.product_name || item.product.name);

      const enrichedItem: DetailedTransactionItem = {
        product_id: item.productId,
        variation_id: item.variationId || undefined,
        name: itemName,
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
      // Fallback to basic item structure with clean names
      const fallbackName = item.variation ? 
        `${extractBaseProductName(item.product.name)} (${item.variation.name})` : 
        extractBaseProductName(item.product.name);

      enrichedItems.push({
        product_id: item.productId,
        variation_id: item.variationId || undefined,
        name: fallbackName,
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
 * Expands a combo product into its component items for transaction storage
 */
async function expandComboProduct(comboItem: CartItem): Promise<DetailedTransactionItem[]> {
  console.log('🔧 Expanding combo product:', comboItem.product.name);
  
  try {
    // Extract component IDs from combo ID: "combo_{uuid1}_{uuid2}"
    const parts = comboItem.productId.split('_');
    if (parts.length !== 3) {
      throw new Error(`Invalid combo ID format: ${comboItem.productId}. Expected format: combo_{uuid1}_{uuid2}`);
    }

    const componentIds = [parts[1], parts[2]];

    // Validate that both parts are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(componentIds[0]) || !uuidRegex.test(componentIds[1])) {
      throw new Error(`Invalid UUID format in combo ID: ${comboItem.productId}`);
    }
    
    const croffleId = componentIds[0];
    const espressoId = componentIds[1];
    
    console.log('🔧 Combo components:', { croffleId, espressoId });
    
    // Fetch both component products with price information
    const { data: croffleProduct } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        category_id,
        price,
        categories (id, name)
      `)
      .eq('id', croffleId)
      .maybeSingle();
      
    const { data: espressoProduct } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        category_id,
        price,
        categories (id, name)
      `)
      .eq('id', espressoId)
      .maybeSingle();

    const comboItems: DetailedTransactionItem[] = [];
    
    // Get pricing information - use product prices as defaults
    const crofflePrice = croffleProduct?.price || 0;
    const espressoPrice = espressoProduct?.price || 0;
    const totalComboPrice = comboItem.price * comboItem.quantity;
    
    // Calculate proportional prices for combo components
    const totalOriginalPrice = crofflePrice + espressoPrice;
    const croffleProportionalPrice = totalOriginalPrice > 0 ? (crofflePrice / totalOriginalPrice) * totalComboPrice : totalComboPrice / 2;
    const espressoProportionalPrice = totalComboPrice - croffleProportionalPrice;

    // Add croffle component
    if (croffleProduct) {
      comboItems.push({
        product_id: croffleId,
        variation_id: undefined,
        name: `${croffleProduct.product_name} (from ${comboItem.product.name})`,
        quantity: comboItem.quantity,
        unit_price: croffleProportionalPrice / comboItem.quantity,
        total_price: croffleProportionalPrice,
        category_id: croffleProduct.category_id,
        category_name: croffleProduct.categories?.name,
        product_type: 'combo_component'
      });
    }
    
    // Add espresso component
    if (espressoProduct) {
      comboItems.push({
        product_id: espressoId,
        variation_id: undefined,
        name: `${espressoProduct.product_name} (from ${comboItem.product.name})`,
        quantity: comboItem.quantity,
        unit_price: espressoProportionalPrice / comboItem.quantity,
        total_price: espressoProportionalPrice,
        category_id: espressoProduct.category_id,
        category_name: espressoProduct.categories?.name,
        product_type: 'combo_component'
      });
    }
    
    console.log('✅ Combo expansion successful:', comboItems.length, 'components created');
    return comboItems;
    
  } catch (error) {
    console.error('❌ Failed to expand combo product:', error);
    
    // Fallback: create a single item with a safe product_id
    // Use a placeholder UUID for combo items that can't be expanded
    const fallbackId = '00000000-0000-0000-0000-000000000000'; // Special UUID for combo fallback
    
    return [{
      product_id: fallbackId,
      variation_id: undefined,
      name: comboItem.product.name,
      quantity: comboItem.quantity,
      unit_price: comboItem.price,
      total_price: comboItem.price * comboItem.quantity,
      category_id: undefined,
      category_name: 'Combo',
      product_type: 'combo'
    }];
  }
}

/**
 * Validates UUID format
 */
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Inserts transaction items into the database
 */
export const insertTransactionItems = async (transactionId: string, items: DetailedTransactionItem[]): Promise<void> => {
  if (items.length === 0) {
    console.log('No items to insert for transaction:', transactionId);
    return;
  }

  // Validate transaction ID is a proper UUID
  if (!isValidUUID(transactionId)) {
    throw new Error(`Invalid transaction ID format: ${transactionId}`);
  }

  console.log('🔄 Inserting transaction items:', {
    transactionId,
    itemCount: items.length,
    items: items.map(item => ({
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  });

  try {
    // Prepare and validate items with exact column mapping
    const itemsToInsert = items.map((item, index) => {
      // Validate product_id is a proper UUID
      if (!isValidUUID(item.product_id)) {
        console.warn(`⚠️ Invalid product_id UUID at index ${index}: ${item.product_id}`);
        throw new Error(`Invalid product_id UUID format: ${item.product_id}`);
      }

      // Validate variation_id if provided
      if (item.variation_id && !isValidUUID(item.variation_id)) {
        console.warn(`⚠️ Invalid variation_id UUID at index ${index}: ${item.variation_id}`);
        throw new Error(`Invalid variation_id UUID format: ${item.variation_id}`);
      }

      // Validate category_id if provided
      if (item.category_id && !isValidUUID(item.category_id)) {
        console.warn(`⚠️ Invalid category_id UUID at index ${index}: ${item.category_id}`);
        throw new Error(`Invalid category_id UUID format: ${item.category_id}`);
      }

      return {
        transaction_id: transactionId,
        product_id: item.product_id,
        variation_id: item.variation_id || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        category_id: item.category_id || null,
        category_name: item.category_name || null,
        product_type: item.product_type || 'regular'
      };
    });

    console.log('🔄 Prepared items for insertion (validated UUIDs):', itemsToInsert);

    // Insert transaction items with detailed debugging
    console.log('🔍 About to insert transaction items:', {
      transactionId,
      itemCount: itemsToInsert.length,
      firstItem: itemsToInsert[0],
      allColumns: Object.keys(itemsToInsert[0] || {})
    });

    const { data, error } = await supabase
      .from("transaction_items")
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error('❌ Database error inserting transaction items:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        transactionId,
        itemCount: items.length,
        sampleData: itemsToInsert[0]
      });
      
      throw new Error(`Failed to save transaction items: ${error.message}`);
    }

    console.log('✅ Transaction items inserted successfully:', {
      transactionId,
      insertedCount: data?.length || items.length
    });
    
  } catch (error) {
    console.error('❌ Critical error inserting transaction items:', error);
    throw error instanceof Error ? error : new Error('Failed to save transaction items');
  }
};