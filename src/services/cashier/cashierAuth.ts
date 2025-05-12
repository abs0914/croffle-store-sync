
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Cashier } from "@/types/cashier";

export interface CashierSignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  storeId: string;
  contactNumber?: string;
}

export const createCashierWithAuth = async (data: CashierSignupData): Promise<Cashier | null> => {
  try {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: `${data.firstName} ${data.lastName}`,
          role: 'cashier'
        },
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      toast.error(`Failed to create cashier account: ${authError.message}`);
      return null;
    }

    if (!authData.user) {
      toast.error('Failed to create user account');
      return null;
    }

    // Then create the cashier record linked to the user
    const { data: cashierData, error: cashierError } = await supabase
      .from('cashiers')
      .insert({
        user_id: authData.user.id,
        store_id: data.storeId,
        first_name: data.firstName,
        last_name: data.lastName,
        contact_number: data.contactNumber,
        is_active: true
      })
      .select()
      .single();

    if (cashierError) {
      console.error('Error creating cashier:', cashierError);
      toast.error(`Failed to create cashier record: ${cashierError.message}`);
      return null;
    }

    toast.success('Cashier created successfully');
    return {
      id: cashierData.id,
      userId: cashierData.user_id,
      storeId: cashierData.store_id,
      firstName: cashierData.first_name,
      lastName: cashierData.last_name,
      contactNumber: cashierData.contact_number,
      isActive: cashierData.is_active,
      fullName: `${cashierData.first_name} ${cashierData.last_name}`,
    };
  } catch (error: any) {
    console.error('Error creating cashier with auth:', error);
    toast.error(`Failed to create cashier: ${error.message}`);
    return null;
  }
};
