
import { supabase } from "@/integrations/supabase/client";
import type { CommissaryPurchase, CommissaryPurchaseForm, PurchaseHistory } from "@/types/commissaryPurchases";
import { toast } from "sonner";

export const fetchCommissaryPurchases = async (limit: number = 50): Promise<CommissaryPurchase[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_purchases')
      .select(`
        *,
        commissary_item:commissary_inventory(id, name, unit, current_stock, category),
        supplier:suppliers(id, name, contact_person, phone, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching commissary purchases:', error);
    toast.error('Failed to fetch purchase history');
    return [];
  }
};

export const createCommissaryPurchase = async (
  purchaseData: CommissaryPurchaseForm,
  userId: string
): Promise<boolean> => {
  try {
    const totalCost = purchaseData.quantity_purchased * purchaseData.unit_cost;
    
    const { error } = await supabase
      .from('commissary_purchases')
      .insert({
        ...purchaseData,
        total_cost: totalCost,
        recorded_by: userId,
        expiry_date: purchaseData.expiry_date || null,
      });

    if (error) throw error;
    
    toast.success('Purchase recorded successfully and inventory updated');
    return true;
  } catch (error) {
    console.error('Error creating commissary purchase:', error);
    toast.error('Failed to record purchase');
    return false;
  }
};

export const fetchPurchaseHistory = async (itemId: string): Promise<PurchaseHistory[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_commissary_purchase_history', { item_id: itemId });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return [];
  }
};

export const fetchCommissaryItemsForPurchase = async () => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('id, name, unit, current_stock, minimum_threshold, category, unit_cost')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching commissary items:', error);
    toast.error('Failed to fetch commissary items');
    return [];
  }
};

export const fetchSuppliersForCommissary = async () => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, contact_person, phone, email, lead_time_days')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    toast.error('Failed to fetch suppliers');
    return [];
  }
};

// New function for bulk purchase orders
export const createBulkCommissaryPurchase = async (
  purchases: CommissaryPurchaseForm[],
  userId: string
): Promise<boolean> => {
  try {
    const purchaseRecords = purchases.map(purchase => ({
      ...purchase,
      total_cost: purchase.quantity_purchased * purchase.unit_cost,
      recorded_by: userId,
      expiry_date: purchase.expiry_date || null,
    }));

    const { error } = await supabase
      .from('commissary_purchases')
      .insert(purchaseRecords);

    if (error) throw error;
    
    toast.success(`${purchases.length} purchases recorded successfully`);
    return true;
  } catch (error) {
    console.error('Error creating bulk commissary purchases:', error);
    toast.error('Failed to record bulk purchases');
    return false;
  }
};

// Function to get low stock commissary items
export const getLowStockCommissaryItems = async () => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .lte('current_stock', 'minimum_threshold')
      .eq('is_active', true)
      .order('current_stock', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    toast.error('Failed to fetch low stock items');
    return [];
  }
};
