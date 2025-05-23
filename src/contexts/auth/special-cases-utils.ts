
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { createAppUserRecord } from "./record-creation-utils";
import type { User } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js"; // Good for explicit error typing if needed

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
  store_ids?: string[]; // store_ids is optional as per original
  first_name?: string;  // first_name is optional
  last_name?: string;   // last_name is optional
}

interface CashierData {
  store_id: string;
  first_name: string;
  last_name: string;
}

// Interface for the app_users existence check
interface ExistingAppUser {
  id: string; // Assuming 'id' is sufficient for the existence check
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

    // For admins, fetch all store IDs
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('id'); // No .maybeSingle() here, result is an array or null

    if (storesError) {
      console.error('Error fetching stores for admin:', storesError);
    } else if (storesData && storesData.length > 0) {
      resultStoreIds = storesData.map((store: StoreData) => store.id);
    }

    // Create app_user record for admin since it doesn't exist yet
    try {
      await createAppUserRecord(
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
          .select('store_ids, first_name, last_name') // Ensure this matches ManagerData
          .eq('email', email)
          .maybeSingle<ManagerData>(); // Applied explicit type

        if (managerError) {
          console.error('Error fetching manager data:', managerError);
        } else if (managerData) { // managerData is now ManagerData | null
          console.log('Found manager record:', managerData);

          // `managerData` is already typed as ManagerData here (if not null)
          // The `as unknown as ManagerData` cast is no longer strictly necessary for type safety
          // but can be kept if it serves a specific purpose or for consistency with old patterns.
          // For cleaner code, access properties directly:
          resultStoreIds = managerData.store_ids || [];

          const names = supabaseUser.user_metadata?.name?.split(' ') || [];
          const firstName = managerData.first_name || names[0] || email.split('@')[0];
          const lastName = managerData.last_name || names.slice(1).join(' ') || '';

          try {
            await createAppUserRecord(
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
          .select('store_id, first_name, last_name') // Ensure this matches CashierData
          .eq('email', email)
          .maybeSingle<CashierData>(); // Applied explicit type

        if (cashiersError) {
          console.error('Error fetching cashier data:', cashiersError);
        } else if (cashiersData) { // cashiersData is now CashierData | null
          console.log('Found cashier record:', cashiersData);

          // `cashiersData` is already typed as CashierData here (if not null)
          resultStoreIds = [cashiersData.store_id];

          try {
            await createAppUserRecord(
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
    // This was the block where the error occurred around line 112 originally.
    if (email) { // This if(email) was in your original code.
      try {
        const names = supabaseUser.user_metadata?.name?.split(' ') || [];
        const firstName = names[0] || email.split('@')[0];
        const lastName = names.slice(1).join(' ') || '';

        // Check if we already have an app_user record for this email
        const { data: existingUser, error: existingUserError } = await supabase
          .from('app_users')
          .select('id') // Minimal selection for existence check
          .eq('email', email)
          .maybeSingle<ExistingAppUser>(); // Applied explicit type

        if (existingUserError) {
          console.error('Error checking for existing app_user:', existingUserError);
        }

        // existingUser is now ExistingAppUser | null
        if (!existingUser && !existingUserError) { // Create only if no user and no error fetching
          await createAppUserRecord(
            supabaseUser.id,
            email,
            firstName,
            lastName,
            resultRole, // This role might be 'manager', 'cashier', or the initial role if not modified
            resultStoreIds, // This might be populated by manager/cashier logic or empty
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