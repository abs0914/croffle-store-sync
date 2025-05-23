
import { supabase } from "@/integrations/supabase/client";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { toast } from "sonner";

export const createAppUser = async (data: AppUserFormData): Promise<AppUser | null> => {
  try {
    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        user_id: data.userId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        contact_number: data.contactNumber,
        role: data.role,
        store_ids: data.storeIds,
        is_active: data.isActive
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating app user:', error);
      toast.error(`Failed to create user: ${error.message}`);
      return null;
    }

    toast.success('User created successfully');
    return {
      id: newUser.id,
      userId: newUser.user_id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      fullName: `${newUser.first_name} ${newUser.last_name}`,
      email: newUser.email,
      contactNumber: newUser.contact_number,
      role: newUser.role,
      storeIds: newUser.store_ids || [],
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    };
  } catch (error: any) {
    console.error('Error in createAppUser:', error);
    toast.error(`Failed to create user: ${error.message}`);
    return null;
  }
};

export const updateAppUser = async (data: AppUserFormData): Promise<AppUser | null> => {
  try {
    if (!data.id) {
      toast.error('User ID is required for update');
      return null;
    }

    const { data: updatedUser, error } = await supabase
      .from('app_users')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        contact_number: data.contactNumber,
        role: data.role,
        store_ids: data.storeIds,
        is_active: data.isActive
      })
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating app user:', error);
      toast.error(`Failed to update user: ${error.message}`);
      return null;
    }

    toast.success('User updated successfully');
    return {
      id: updatedUser.id,
      userId: updatedUser.user_id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      fullName: `${updatedUser.first_name} ${updatedUser.last_name}`,
      email: updatedUser.email,
      contactNumber: updatedUser.contact_number,
      role: updatedUser.role,
      storeIds: updatedUser.store_ids || [],
      isActive: updatedUser.is_active,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };
  } catch (error: any) {
    console.error('Error in updateAppUser:', error);
    toast.error(`Failed to update user: ${error.message}`);
    return null;
  }
};

export const deleteAppUser = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting app user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
      return false;
    }

    toast.success('User deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error in deleteAppUser:', error);
    toast.error(`Failed to delete user: ${error.message}`);
    return false;
  }
};
