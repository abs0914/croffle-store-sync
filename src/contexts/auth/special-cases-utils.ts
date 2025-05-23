
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

// Define the minimal interface for the app_users existence check
interface ExistingAppUser {
  id: string; // Adjust type if your id is not a string
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

  if (email === 'admin@example.com') {
    // ... (admin logic as before) ...
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
    if (role === 'manager') {
      // ... (manager logic as before, using its explicit cast) ...
      try {
        const { data: managerData, error: managerError } = await supabase
          .from('managers')
          .select('store_ids, first_name, last_name')
          .eq('email', email)
          .maybeSingle();
        if (managerError) {
          console.error('Error fetching manager data:', managerError);
        } else if (managerData) {
          const manager = managerData as unknown as ManagerData;
          resultStoreIds = manager.store_ids || [];
          const names = supabaseUser.user_metadata?.name?.split(' ') || [];
          const firstName = manager.first_name || names[0] || email.split('@')[0];
          const lastName = manager.last_name || names.slice(1).join(' ') || '';
          try {
            await createAppUserRecord(supabaseUser.id, email, firstName, lastName, resultRole, resultStoreIds, true);
          } catch (insertErr) {
            console.error('Failed to create app_user for manager:', insertErr);
          }
        }
      } catch (error) {
        console.error('Error checking managers data:', error);
      }
    } else if (role === 'cashier') {
      // ... (cashier logic as before, using its explicit cast) ...
      try {
        const { data: cashiersData, error: cashiersError } = await supabase
          .from('cashiers')
          .select('store_id, first_name, last_name')
          .eq('email', email)
          .maybeSingle();
        if (cashiersError) {
          console.error('Error fetching cashier data:', cashiersError);
        } else if (cashiersData) {
          const cashier = cashiersData as unknown as CashierData;
          resultStoreIds = [cashier.store_id];
          try {
            await createAppUserRecord(supabaseUser.id, email, cashier.first_name, cashier.last_name, resultRole, resultStoreIds, true);
          } catch (insertErr) {
            console.error('Failed to create app_user for cashier:', insertErr);
          }
        }
      } catch (error) {
        console.error('Error checking cashier data:', error);
      }
    }

    if (email) { // This outer if(email) was in your original code
      try {
        const names = supabaseUser.user_metadata?.name?.split(' ') || [];
        const firstName = names[0] || email.split('@')[0];
        const lastName = names.slice(1).join(' ') || '';

        // Check if we already have an app_user record for this email
        // MODIFIED LINE:
        const { data: existingUser, error: existingUserError } = await supabase
          .from('app_users')
          .select('id') // Ensure this is selecting only 'id' or minimal simple columns
          .eq('email', email)
          .maybeSingle<ExistingAppUser>(); // Apply explicit type here

        if (existingUserError) {
          console.error('Error checking for existing app_user:', existingUserError);
          // Consider if you need to stop execution or throw an error here
        }
        
        // existingUser is now of type ExistingAppUser | null
        if (!existingUser && !existingUserError) { // Only create if user doesn't exist AND no error occurred
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
