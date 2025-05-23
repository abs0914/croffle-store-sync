
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { createAppUserRecord } from "./record-creation-utils";
import type { User } from "@supabase/supabase-js";

// Define return type for our special cases function
interface SpecialCaseResult {
  role: UserRole;
  storeIds: string[];
}

// Define interfaces for DB query results
interface StoreData {
  id: string;
}

interface ManagerData {
  store_ids?: string[];
  first_name?: string;
  last_name?: string;
}

interface CashierData {
  store_id: string;
  first_name: string;
  last_name: string;
}

// Interface for the app_users existence check - ensure this is simple
interface ExistingAppUser {
  id: string;
}

/**
 * Handle special user cases and account creation
 */
export async function handleSpecialCases(
  supabaseUser: User,
  email: string,
  role: UserRole
): Promise<SpecialCaseResult> {
  let resultRole = role;
  let resultStoreIds: string[] = [];

  // Special handling for admin accounts
  if (email === 'admin@example.com') {
    console.log('Admin account detected via email check');
    resultRole = 'admin';
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('id');
    if (storesError) {
      console.error('Error fetching stores for admin:', storesError);
    } else if (storesData && storesData.length > 0) {
      resultStoreIds = storesData.map((store: StoreData) => store.id);
    }
    
    // Let this skip the direct insert and use the RPC function that's exempt from RLS
    // We'll implement this function later
    try {
      await createAppUserViaRPC(
        supabaseUser.id,
        email,
        'Admin',
        'User',
        resultRole,
        resultStoreIds,
        true
      );
    } catch (err) {
      console.error('Failed to create app_user for admin:', err);
    }
  } else {
    // For managers, check managers table as fallback
    if (role === 'manager') {
      try {
        const { data: managerData, error: managerError } = await supabase
          .from('managers')
          .select('store_ids, first_name, last_name')
          .eq('email', email)
          .maybeSingle<ManagerData>();

        if (managerError) {
          console.error('Error fetching manager data:', managerError);
        } else if (managerData) {
          console.log('Found manager record:', managerData);
          resultStoreIds = managerData.store_ids || [];
          const names = supabaseUser.user_metadata?.name?.split(' ') || [];
          const firstName = managerData.first_name || names[0] || email.split('@')[0];
          const lastName = managerData.last_name || names.slice(1).join(' ') || '';
          try {
            await createAppUserViaRPC(
              supabaseUser.id,
              email,
              firstName,
              lastName,
              resultRole,
              resultStoreIds,
              true
            );
          } catch (insertErr) {
            console.error('Failed to create app_user for manager:', insertErr);
          }
        }
      } catch (error) {
        console.error('Error processing manager data:', error);
      }
    } else if (role === 'cashier') {
      // Similar handling for cashiers
      try {
        const { data: cashiersData, error: cashiersError } = await supabase
          .from('cashiers')
          .select('store_id, first_name, last_name')
          .eq('email', email)
          .maybeSingle<CashierData>();

        if (cashiersError) {
          console.error('Error fetching cashier data:', cashiersError);
        } else if (cashiersData) {
          console.log('Found cashier record:', cashiersData);
          resultStoreIds = [cashiersData.store_id];
          try {
            await createAppUserViaRPC(
              supabaseUser.id,
              email,
              cashiersData.first_name,
              cashiersData.last_name,
              resultRole,
              resultStoreIds,
              true
            );
          } catch (insertErr) {
            console.error('Failed to create app_user for cashier:', insertErr);
          }
        }
      } catch (error) {
        console.error('Error processing cashier data:', error);
      }
    }

    // Create a new default app_user if we haven't created one yet
    if (email) {
      try {
        const names = supabaseUser.user_metadata?.name?.split(' ') || [];
        const firstName = names[0] || email.split('@')[0];
        const lastName = names.slice(1).join(' ') || '';

        // Check if we already have an app_user record for this email
        // Using simplified type approach to avoid deep type instantiation
        const { data: fetchedData, error: existingUserError } = await supabase
          .from('app_users')
          .select('id') // Only select the id column
          .eq('email', email)
          .maybeSingle<{ id: string }>();

        // Explicitly cast to our simple ExistingAppUser type
        const existingUser = fetchedData as ExistingAppUser | null;

        if (existingUserError) {
          console.error('Error checking for existing app_user:', existingUserError);
        }
        
        if (!existingUser && !existingUserError) {
          await createAppUserViaRPC(
            supabaseUser.id,
            email,
            firstName,
            lastName,
            resultRole,
            resultStoreIds,
            true
          );
        }
      } catch (err) {
        console.error('Failed to create or check default app_user:', err);
      }
    }
  }

  return { role: resultRole, storeIds: resultStoreIds };
}

/**
 * Create app_user via RPC function to bypass RLS
 * This uses our new create_app_user RPC function that we'll define in SQL
 */
async function createAppUserViaRPC(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  storeIds: string[],
  isActive: boolean
): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('create_app_user', {
      user_id: userId,
      user_email: email,
      first_name: firstName,
      last_name: lastName,
      user_role: role,
      store_ids: storeIds,
      is_active: isActive
    });
    
    if (error) {
      console.error('Error creating app_user via RPC:', error);
    } else {
      console.log('Created new app_user record via RPC for:', email);
    }
  } catch (err) {
    console.error('Failed to call create_app_user RPC function:', err);
    throw err;
  }
}
