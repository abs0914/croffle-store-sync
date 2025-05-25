
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
    console.log(`Fetching active cashiers for store: ${storeId}`);

    // First try to fetch from the cashiers table (legacy approach)
    const { data: cashiersData, error: cashiersError } = await supabase
      .from('cashiers')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (cashiersError) {
      console.warn('Error fetching from cashiers table:', cashiersError.message);
    }

    // Use RPC function to get store users (includes cashiers from app_users table)
    const { data: storeUsersData, error: storeUsersError } = await supabase
      .rpc('get_store_users', { store_id_param: storeId });

    if (storeUsersError) {
      console.warn('Error fetching from get_store_users RPC:', storeUsersError.message);
    }

    const cashiers: Cashier[] = [];

    // Map cashiers from the cashiers table
    if (cashiersData && cashiersData.length > 0) {
      console.log(`Found ${cashiersData.length} cashiers in cashiers table`);
      cashiers.push(...cashiersData.map(cashier => ({
        id: cashier.id,
        userId: cashier.user_id,
        storeId: cashier.store_id,
        firstName: cashier.first_name,
        lastName: cashier.last_name,
        contactNumber: cashier.contact_number,
        isActive: cashier.is_active,
        fullName: `${cashier.first_name} ${cashier.last_name}`,
      })));
    }

    // Map cashiers from the app_users table (via RPC)
    if (storeUsersData && storeUsersData.length > 0) {
      console.log(`Found ${storeUsersData.length} users from get_store_users RPC`);

      // Filter for cashier role users only
      const cashierUsers = storeUsersData.filter(user =>
        user.role === 'cashier' && user.is_active
      );

      console.log(`Found ${cashierUsers.length} cashier users in app_users table`);

      cashierUsers.forEach(appUser => {
        // Check if this user is already in the cashiers list (to avoid duplicates)
        const existingCashier = cashiers.find(c => c.userId === appUser.user_id);
        if (!existingCashier) {
          cashiers.push({
            id: appUser.id, // Use app_users id as cashier id
            userId: appUser.user_id,
            storeId: storeId, // Use the requested store ID
            firstName: appUser.first_name,
            lastName: appUser.last_name,
            contactNumber: appUser.contact_number,
            isActive: appUser.is_active,
            fullName: `${appUser.first_name} ${appUser.last_name}`,
          });
        }
      });
    }

    // Sort cashiers by last name
    cashiers.sort((a, b) => a.lastName.localeCompare(b.lastName));

    console.log(`Total cashiers found: ${cashiers.length}`);
    return cashiers;

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
