import { supabase } from "@/integrations/supabase/client";

// Check if a commissary item is linked to any stores
export const checkCommissaryItemLinks = async (itemId: string): Promise<{
  isLinked: boolean;
  linkedStores: Array<{storeId: string; storeName: string}>;
}> => {
  try {
    // Check conversions table for any records using this item
    const { data: conversions, error: conversionError } = await supabase
      .from('inventory_conversions')
      .select(`
        id,
        store_id
      `)
      .eq('commissary_item_id', itemId)
      .limit(5);

    if (conversionError) throw conversionError;

    // Check restock requests for any records using this item  
    const { data: restockRequests, error: restockError } = await supabase
      .from('commissary_restock_requests')
      .select(`
        id,
        store_id
      `)
      .eq('commissary_item_id', itemId)
      .limit(5);

    if (restockError) throw restockError;

    // Get unique store IDs
    const storeIds = new Set<string>();
    conversions?.forEach(conversion => storeIds.add(conversion.store_id));
    restockRequests?.forEach(request => storeIds.add(request.store_id));

    // Fetch store names separately
    const linkedStores: Array<{storeId: string; storeName: string}> = [];
    if (storeIds.size > 0) {
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .in('id', Array.from(storeIds));

      if (storesError) throw storesError;

      stores?.forEach(store => {
        linkedStores.push({
          storeId: store.id,
          storeName: store.name
        });
      });
    }

    return {
      isLinked: linkedStores.length > 0,
      linkedStores
    };
  } catch (error) {
    console.error('Error checking commissary item links:', error);
    return { isLinked: false, linkedStores: [] };
  }
};

// Get detailed usage information for a commissary item
export const getCommissaryItemUsageDetails = async (itemId: string) => {
  try {
    const { data: conversions, error: conversionError } = await supabase
      .from('inventory_conversions')
      .select(`
        id,
        conversion_date,
        finished_goods_quantity,
        store_id
      `)
      .eq('commissary_item_id', itemId)
      .order('conversion_date', { ascending: false })
      .limit(10);

    const { data: restockRequests, error: restockError } = await supabase
      .from('commissary_restock_requests')
      .select(`
        id,
        created_at,
        requested_quantity,
        status,
        store_id
      `)
      .eq('commissary_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      conversions: conversions || [],
      restockRequests: restockRequests || [],
      hasError: !!conversionError || !!restockError
    };
  } catch (error) {
    console.error('Error getting usage details:', error);
    return { conversions: [], restockRequests: [], hasError: true };
  }
};