
import { supabase } from "@/integrations/supabase/client";
import { Cashier } from "@/types/cashier";
import { toast } from "sonner";

export const fetchCashiers = async (storeId: string): Promise<Cashier[]> => {
  try {
    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .eq('store_id', storeId)
      .order('last_name', { ascending: true });

    if (error) {
      throw error;
    }

    return data.map(cashier => ({
      id: cashier.id,
      userId: cashier.user_id,
      storeId: cashier.store_id,
      firstName: cashier.first_name,
      lastName: cashier.last_name,
      contactNumber: cashier.contact_number,
      isActive: cashier.is_active,
      fullName: `${cashier.first_name} ${cashier.last_name}`,
    }));
  } catch (error: any) {
    console.error('Error fetching cashiers:', error);
    toast.error(`Failed to load cashiers: ${error.message}`);
    return [];
  }
};

export const fetchActiveCashiers = async (storeId: string): Promise<Cashier[]> => {
  try {
    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (error) {
      throw error;
    }

    return data.map(cashier => ({
      id: cashier.id,
      userId: cashier.user_id,
      storeId: cashier.store_id,
      firstName: cashier.first_name,
      lastName: cashier.last_name,
      contactNumber: cashier.contact_number,
      isActive: cashier.is_active,
      fullName: `${cashier.first_name} ${cashier.last_name}`,
    }));
  } catch (error: any) {
    console.error('Error fetching active cashiers:', error);
    toast.error(`Failed to load active cashiers: ${error.message}`);
    return [];
  }
};

export const fetchCashierById = async (id: string): Promise<Cashier | null> => {
  try {
    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      storeId: data.store_id,
      firstName: data.first_name,
      lastName: data.last_name,
      contactNumber: data.contact_number,
      isActive: data.is_active,
      fullName: `${data.first_name} ${data.last_name}`,
    };
  } catch (error: any) {
    console.error('Error fetching cashier:', error);
    toast.error(`Failed to load cashier: ${error.message}`);
    return null;
  }
};
