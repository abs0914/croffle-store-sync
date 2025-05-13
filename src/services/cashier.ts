
import { supabase } from "@/integrations/supabase/client";
import { Cashier } from "@/types/cashier";

/**
 * Fetch all cashiers for a specific store
 * @param storeId - The ID of the store
 */
export const fetchCashiersByStoreId = async (storeId: string): Promise<Cashier[]> => {
  const { data, error } = await supabase
    .from('cashiers')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('last_name', { ascending: true });

  if (error) {
    console.error('Error fetching cashiers:', error);
    throw error;
  }

  // Transform database rows to include fullName
  return (data || []).map(cashier => ({
    id: cashier.id,
    userId: cashier.user_id,
    storeId: cashier.store_id,
    firstName: cashier.first_name,
    lastName: cashier.last_name,
    contactNumber: cashier.contact_number,
    isActive: cashier.is_active,
    fullName: `${cashier.first_name} ${cashier.last_name}`
  })) as Cashier[];
};

/**
 * Fetch a single cashier by ID
 * @param id - The ID of the cashier to fetch
 */
export const fetchCashierById = async (id: string): Promise<Cashier | null> => {
  const { data, error } = await supabase
    .from('cashiers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('Error fetching cashier:', error);
    throw error;
  }

  if (!data) return null;

  // Add fullName to cashier data
  return {
    id: data.id,
    userId: data.user_id,
    storeId: data.store_id,
    firstName: data.first_name,
    lastName: data.last_name,
    contactNumber: data.contact_number,
    isActive: data.is_active,
    fullName: `${data.first_name} ${data.last_name}`
  } as Cashier;
};

/**
 * Alias for fetchCashiersByStoreId to maintain backward compatibility
 */
export const fetchCashiers = fetchCashiersByStoreId;
