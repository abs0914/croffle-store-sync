
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Generates and sends a password reset link to the manager's email
 * @param managerId ID of the manager to reset password for
 * @returns Promise resolving to boolean success state
 */
export const resetManagerPassword = async (managerId: string): Promise<boolean> => {
  try {
    // Get the manager's email
    const { data: managerData, error: managerError } = await supabase
      .from('managers')
      .select('email')
      .eq('id', managerId)
      .single();
    
    if (managerError || !managerData?.email) {
      throw new Error(managerError?.message || 'Manager not found');
    }
    
    // Generate a password reset link for the user
    const { error } = await supabase.auth.resetPasswordForEmail(
      managerData.email,
      {
        redirectTo: window.location.origin + '/password-reset'
      }
    );
    
    if (error) {
      throw error;
    }
    
    toast.success('Password reset link has been sent to the manager\'s email');
    return true;
  } catch (error: any) {
    console.error('Error resetting manager password:', error);
    toast.error(`Password reset failed: ${error.message}`);
    return false;
  }
};
