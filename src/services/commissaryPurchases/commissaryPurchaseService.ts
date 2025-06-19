
import { supabase } from "@/integrations/supabase/client";
import type { CommissaryPurchase, CommissaryPurchaseForm, PurchaseHistory } from "@/types/commissaryPurchases";
import { toast } from "sonner";

export const fetchCommissaryPurchases = async (limit: number = 20): Promise<CommissaryPurchase[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_purchases')
      .select(`
        *,
        commissary_item:commissary_inventory(id, name, unit, current_stock),
        supplier:suppliers(id, name)
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
    
    toast.success('Purchase recorded successfully');
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
      .select('id, name, unit, current_stock, minimum_threshold')
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

export const fetchSuppliers = async () => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, contact_person, phone, email')
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
