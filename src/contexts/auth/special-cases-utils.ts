
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { createAppUserRecord } from "./record-creation-utils";
import type { User } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";

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
  id: string; // Or the actual type of your id column
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
    try {
      await createAppUserRecord(supabaseUser.id, email, 'Admin', 'User', resultRole, resultStoreIds, true);
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
          .maybeSingle<ManagerData>(); // Retain explicit generic here

        if (managerError) {
          console.error('Error fetching manager data:', managerError);
        } else if (managerData) {
          console.log('Found manager record:', managerData);
          resultStoreIds = managerData.store_ids || [];
          const names = supabaseUser.user_metadata?.name?.split(' ') || [];
          const firstName = managerData.first_name || names[0] || email.split('@')[0];
          const lastName = managerData.last_name || names.slice(1).join(' ') || '';
          try {
            await createAppUserRecord(supabaseUser.id, email, firstName, lastName, resultRole, resultStoreIds, true);
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
          .maybeSingle<CashierData>(); // Retain explicit generic here

        if (cashiersError) {
          console.error('Error fetching cashier data:', cashiersError);
        } else if (cashiersData) {
          console.log('Found cashier record:', cashiersData);
          resultStoreIds = [cashiersData.store_id];
          try {
            await createAppUserRecord(supabaseUser.id, email, cashiersData.first_name, cashiersData.last_name, resultRole, resultStoreIds, true);
          } catch (insertErr) {
            console.error('Failed to create app_user for cashier:', insertErr);
          }
        }
      } catch (error) {
        console.error('Error processing cashier data:', error);
      }
    }

    // Create a new default app_user if we haven't created one yet
    // THIS IS LIKELY WHERE LINE 122 IS LOCATED
    if (email) {
      try {
        const names = supabaseUser.user_metadata?.name?.split(' ') || [];
        const firstName = names[0] || email.split('@')[0];
        const lastName = names.slice(1).join(' ') || '';

        // Check if we already have an app_user record for this email
        // Applying the "as unknown as Type" pattern due to persistent TS2589
        const { data: rawExistingUserData, error: existingUserError } = await supabase
          .from('app_users')
          .select('id') // Keep selection minimal
          .eq('email', email)
          .maybeSingle(); // Removed <ExistingAppUser> generic to use the cast below

        // Force cast the data part of the result
        const existingUser = rawExistingUserData as unknown as (ExistingAppUser | null);

        if (existingUserError) {
          console.error('Error checking for existing app_user:', existingUserError);
          // Potentially throw or return to prevent further execution on error
        }
        
        if (!existingUser && !existingUserError) {
          await createAppUserRecord(
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