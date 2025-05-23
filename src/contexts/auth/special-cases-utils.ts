
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { createAppUserRecord } from "./record-creation-utils";
import type { PostgrestError, User } from "@supabase/supabase-js";
import type { SupabaseQueryResult } from "@/types";

// Define return type for our special cases function
interface SpecialCaseResult {
  role: UserRole;
  storeIds: string[];
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
    const { data: storesData }: { data: any[] | null; error: PostgrestError | null } = await supabase
      .from('stores')
      .select('id');
      
    if (storesData && storesData.length > 0) {
      resultStoreIds = storesData.map(store => store.id);
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
        interface ManagerData {
          store_ids?: string[];
          first_name?: string;
          last_name?: string;
        }
        
        const { data: managerData }: { data: ManagerData | null; error: PostgrestError | null } = await supabase
          .from('managers')
          .select('store_ids, first_name, last_name')
          .eq('email', email)
          .maybeSingle();
        
        if (managerData) {
          console.log('Found manager record:', managerData);
          resultStoreIds = managerData.store_ids || [];
          
          // Create app_user record since it doesn't exist yet
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
            console.error('Failed to create app_user:', insertErr);
          }
        }
      } catch (error) {
        console.error('Error checking managers data:', error);
      }
    } else if (role === 'cashier') {
      // Similar handling for cashiers
      try {
        interface CashierData {
          store_id: string;
          first_name: string;
          last_name: string;
        }
        
        const { data: cashiersData }: { data: CashierData | null; error: PostgrestError | null } = await supabase
          .from('cashiers')
          .select('store_id, first_name, last_name')
          .eq('email', email)
          .maybeSingle();
          
        if (cashiersData) {
          resultStoreIds = [cashiersData.store_id];
          
          // Create app_user record
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
        console.error('Error checking cashier data:', error);
      }
    }
    
    // Create a new default app_user if we haven't created one yet
    if (email) {
      try {
        const names = supabaseUser.user_metadata?.name?.split(' ') || [];
        const firstName = names[0] || email.split('@')[0];
        const lastName = names.slice(1).join(' ') || '';
        
        await createAppUserRecord(
          supabaseUser.id,
          email,
          firstName,
          lastName,
          resultRole,
          resultStoreIds,
          true
        );
      } catch (err) {
        console.error('Failed to create default app_user:', err);
      }
    }
  }

  return { role: resultRole, storeIds: resultStoreIds };
}
