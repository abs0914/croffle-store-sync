
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { createAppUserRecord } from "./record-creation-utils";
import type { User } from "@supabase/supabase-js";

// Define return type for our special cases function
interface SpecialCaseResult {
  role: UserRole;
  storeIds: string[];
}

// Define simple interfaces for DB query results
interface StoreData {
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
    
    // Create admin user record via our RPC function
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
        const { data, error } = await supabase
          .from('managers')
          .select('store_ids, first_name, last_name')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          console.error('Error fetching manager data:', error);
        } else if (data) {
          console.log('Found manager record:', data);
          resultStoreIds = data.store_ids || [];
          const names = supabaseUser.user_metadata?.name?.split(' ') || [];
          const firstName = data.first_name || names[0] || email.split('@')[0];
          const lastName = data.last_name || names.slice(1).join(' ') || '';
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
        const { data, error } = await supabase
          .from('cashiers')
          .select('store_id, first_name, last_name')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          console.error('Error fetching cashier data:', error);
        } else if (data) {
          console.log('Found cashier record:', data);
          resultStoreIds = [data.store_id];
          try {
            await createAppUserRecord(
              supabaseUser.id,
              email,
              data.first_name,
              data.last_name,
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
        const { data, error } = await supabase
          .from('app_users')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        
        if (error) {
          console.error('Error checking for existing app_user:', error);
        }
        
        if (!data && !error) {
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
