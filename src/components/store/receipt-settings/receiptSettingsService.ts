
import { supabase } from "@/integrations/supabase/client";
import { StoreSettings } from "@/types";

export async function fetchStoreSettings(storeId: string): Promise<StoreSettings | null> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { 
      // PGRST116 is "no rows returned" error
      throw error;
    }

    if (data) {
      return {
        id: data.id,
        storeId: data.store_id,
        receiptHeader: data.receipt_header || "",
        receiptFooter: data.receipt_footer || "Thank you for shopping with us!",
        taxPercentage: data.tax_percentage || 0,
        isTaxInclusive: data.is_tax_inclusive || false,
        currency: data.currency || "USD",
        timezone: data.timezone || "UTC"
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching store settings:", error);
    throw error;
  }
}

export async function saveStoreSettings(settings: StoreSettings): Promise<void> {
  try {
    if (settings.id) {
      // Update existing settings
      const { error } = await supabase
        .from('store_settings')
        .update({
          receipt_header: settings.receiptHeader,
          receipt_footer: settings.receiptFooter,
          tax_percentage: settings.taxPercentage,
          is_tax_inclusive: settings.isTaxInclusive,
          currency: settings.currency,
          timezone: settings.timezone
        })
        .eq('id', settings.id);
        
      if (error) throw error;
    } else {
      // Insert new settings
      const { error } = await supabase
        .from('store_settings')
        .insert({
          store_id: settings.storeId,
          receipt_header: settings.receiptHeader,
          receipt_footer: settings.receiptFooter,
          tax_percentage: settings.taxPercentage,
          is_tax_inclusive: settings.isTaxInclusive,
          currency: settings.currency,
          timezone: settings.timezone
        });
        
      if (error) throw error;
    }
  } catch (error) {
    console.error("Error saving store settings:", error);
    throw error;
  }
}
