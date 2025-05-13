
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
    .eq('storeId', storeId)
    .eq('isActive', true)
    .order('lastName', { ascending: true });

  if (error) {
    console.error('Error fetching cashiers:', error);
    throw error;
  }

  // Transform database rows to include fullName
  return (data || []).map(cashier => ({
    ...cashier,
    fullName: `${cashier.firstName} ${cashier.lastName}`
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
    ...data,
    fullName: `${data.firstName} ${data.lastName}`
  } as Cashier;
};
