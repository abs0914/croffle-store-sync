
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const deleteCashier = async (id: string): Promise<boolean> => {
  try {
    // Begin transaction with delete operation
    // The database trigger we created will handle the auth user deletion
    const { error } = await supabase
      .from('cashiers')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    toast.success('Cashier deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting cashier:', error);
    toast.error(`Failed to delete cashier: ${error.message}`);
    return false;
  }
};
