
import { supabase } from "@/integrations/supabase/client";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { RolePermissions } from "@/types/rolePermissions";
import { toast } from "sonner";

export const createAppUser = async (data: AppUserFormData): Promise<AppUser | null> => {
  try {
    // Validate input data before proceeding
    const { error: validationError } = await supabase.rpc('validate_user_input', {
      p_email: data.email,
      p_first_name: data.firstName,
      p_last_name: data.lastName,
      p_contact_number: data.contactNumber
    });

    if (validationError) {
      console.error('Input validation failed:', validationError);
      toast.error(`Invalid input: ${validationError.message}`);
      return null;
    }

    // For admin and owner users, automatically assign all active stores if no stores are specified
    let storeIds = data.storeIds;
    if ((data.role === 'admin' || data.role === 'owner') && (!storeIds || storeIds.length === 0)) {
      try {
        const { data: stores, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('is_active', true);
        
        if (!storeError && stores) {
          storeIds = stores.map(store => store.id);
          console.log(`Assigning all ${stores.length} stores to ${data.role} user:`, data.email);
        }
      } catch (error) {
        console.error('Error fetching stores for admin/owner:', error);
      }
    }

    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        user_id: data.userId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        contact_number: data.contactNumber,
        role: data.role as any,
        store_ids: storeIds,
        is_active: data.isActive,
        custom_permissions: data.customPermissions || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating app user:', error);
      // Only show toast for non-RLS policy errors to avoid duplicate creation noise
      if (!error.message.includes('row-level security policy')) {
        toast.error(`Failed to create user: ${error.message}`);
      }
      return null;
    }

    // If role is cashier and has store assignments, create cashier entries
    if (data.role === 'cashier' && storeIds && storeIds.length > 0 && newUser.user_id) {
      for (const storeId of storeIds) {
        try {
          const { error: cashierError } = await supabase
            .from('cashiers')
            .insert({
              user_id: newUser.user_id,
              store_id: storeId,
              first_name: data.firstName,
              last_name: data.lastName,
              is_active: data.isActive,
              contact_number: data.contactNumber
            });
          
          if (cashierError && !cashierError.message.includes('duplicate')) {
            console.warn(`Failed to create cashier entry for store ${storeId}:`, cashierError);
          } else {
            console.log(`✅ Created cashier entry for store ${storeId}`);
          }
        } catch (err) {
          console.warn('Error creating cashier entry:', err);
        }
      }
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
        updatedAt: newUser.updated_at,
        customPermissions: newUser.custom_permissions ? newUser.custom_permissions as Partial<RolePermissions> : undefined
      };
  } catch (error: any) {
    console.error('Error in createAppUser:', error);
    // Only show toast for non-RLS policy errors to avoid duplicate creation noise
    if (!error.message?.includes('row-level security policy')) {
      toast.error(`Failed to create user: ${error.message}`);
    }
    return null;
  }
};

export const updateAppUser = async (data: AppUserFormData): Promise<AppUser | null> => {
  try {
    if (!data.id) {
      toast.error('User ID is required for update');
      return null;
    }

    // Validate input data before proceeding
    const { error: validationError } = await supabase.rpc('validate_user_input', {
      p_email: data.email,
      p_first_name: data.firstName,
      p_last_name: data.lastName,
      p_contact_number: data.contactNumber
    });

    if (validationError) {
      console.error('Input validation failed:', validationError);
      toast.error(`Invalid input: ${validationError.message}`);
      return null;
    }

    const { data: updatedUser, error } = await supabase
      .from('app_users')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        contact_number: data.contactNumber,
        role: data.role as any,
        store_ids: data.storeIds,
        is_active: data.isActive,
        custom_permissions: data.customPermissions || null
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
      updatedAt: updatedUser.updated_at,
      customPermissions: updatedUser.custom_permissions ? updatedUser.custom_permissions as Partial<RolePermissions> : undefined
    };
  } catch (error: any) {
    console.error('Error in updateAppUser:', error);
    toast.error(`Failed to update user: ${error.message}`);
    return null;
  }
};

export const deleteAppUser = async (id: string): Promise<boolean> => {
  try {
    console.log('Attempting to delete app user with ID:', id);

    // First, check if this user has a user_id (linked to auth)
    const { data: userData, error: fetchError } = await supabase
      .from('app_users')
      .select('user_id, email')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching user data for deletion:', fetchError);
      toast.error(`Failed to delete user: ${fetchError.message}`);
      return false;
    }

    // Delete the app_users entry first
    const { error: deleteError } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting app user:', deleteError);
      toast.error(`Failed to delete user: ${deleteError.message}`);
      return false;
    }

    // If the user has an auth account, inform the admin they need to delete it separately
    if (userData?.user_id) {
      toast.success('User record deleted successfully');
      toast.info('Note: The associated auth account must be deleted from the Supabase dashboard');
    } else {
      toast.success('User deleted successfully');
    }

    return true;
  } catch (error: any) {
    console.error('Error in deleteAppUser:', error);
    toast.error(`Failed to delete user: ${error.message}`);
    return false;
  }
};
