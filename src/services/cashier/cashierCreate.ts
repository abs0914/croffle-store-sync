
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Cashier } from "@/types/cashier";

export interface CashierCreateData {
  user_id?: string;
  store_id: string;
  first_name: string;
  last_name: string;
  contact_number?: string;
}

export const createCashier = async (data: CashierCreateData): Promise<Cashier | null> => {
  try {
    const { data: newCashier, error } = await supabase
      .from('cashiers')
      .insert({
        user_id: data.user_id,
        store_id: data.store_id,
        first_name: data.first_name,
        last_name: data.last_name,
        contact_number: data.contact_number,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating cashier:', error);
      toast.error(`Failed to create cashier: ${error.message}`);
      return null;
    }

    toast.success('Cashier created successfully');
    return {
      id: newCashier.id,
      userId: newCashier.user_id,
      storeId: newCashier.store_id,
      firstName: newCashier.first_name,
      lastName: newCashier.last_name,
      contactNumber: newCashier.contact_number,
      isActive: newCashier.is_active,
      fullName: `${newCashier.first_name} ${newCashier.last_name}`,
    };
  } catch (error: any) {
    console.error('Error creating cashier:', error);
    toast.error(`Failed to create cashier: ${error.message}`);
    return null;
  }
};
