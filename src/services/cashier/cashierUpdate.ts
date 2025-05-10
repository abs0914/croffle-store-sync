
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Cashier } from "@/types/cashier";

export interface CashierUpdateData {
  id: string;
  firstName?: string;
  lastName?: string;
  contactNumber?: string;
  isActive?: boolean;
  userId?: string | null;
}

export const updateCashier = async (data: CashierUpdateData): Promise<Cashier | null> => {
  try {
    const updateData: Record<string, any> = {};
    
    if (data.firstName !== undefined) updateData.first_name = data.firstName;
    if (data.lastName !== undefined) updateData.last_name = data.lastName;
    if (data.contactNumber !== undefined) updateData.contact_number = data.contactNumber;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.userId !== undefined) updateData.user_id = data.userId;
    
    updateData.updated_at = new Date().toISOString();

    const { data: updatedCashier, error } = await supabase
      .from('cashiers')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    toast.success('Cashier updated successfully');
    return {
      id: updatedCashier.id,
      userId: updatedCashier.user_id,
      storeId: updatedCashier.store_id,
      firstName: updatedCashier.first_name,
      lastName: updatedCashier.last_name,
      contactNumber: updatedCashier.contact_number,
      isActive: updatedCashier.is_active,
      fullName: `${updatedCashier.first_name} ${updatedCashier.last_name}`,
    };
  } catch (error: any) {
    console.error('Error updating cashier:', error);
    toast.error(`Failed to update cashier: ${error.message}`);
    return null;
  }
};
