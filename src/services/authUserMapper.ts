
import { User, UserRole } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Function to convert Supabase profile data to our app's User type
export const mapProfileToUser = async (supabaseUser: any): Promise<User | null> => {
  if (!supabaseUser) return null;
  
  try {
    console.log('Mapping user profile for ID:', supabaseUser.id);
    
    // Fetch the profile data
    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Unable to retrieve user profile");
    }
    
    if (!profileData) {
      console.error("No profile found for user:", supabaseUser.id);
      throw new Error("User profile not found");
    }
    
    console.log('Profile data found:', profileData);
    
    // For admin users, we don't need to fetch store IDs - they have access to all
    let storeIds: string[] = [];
    
    // Only fetch store access for non-admin users
    if (profileData.role !== 'admin') {
      try {
        // Use a simple query that's less likely to cause issues
        const { data: storeAccess, error: storeError } = await supabase
          .from('user_store_access')
          .select('store_id')
          .eq('user_id', supabaseUser.id);
        
        if (storeError) {
          console.error("Store access fetch error:", storeError);
          // Continue with empty storeIds instead of throwing
        } else if (storeAccess && storeAccess.length > 0) {
          storeIds = storeAccess.map(access => access.store_id);
          console.log('Store access:', storeIds.length, 'stores');
        } else {
          console.log('No store access entries found');
        }
      } catch (storeError: any) {
        console.error("Error fetching store access:", storeError);
        // Continue with empty storeIds array
      }
    } else {
      console.log('Admin user detected, skipping store access fetch');
    }
    
    // Map the data to our User type
    const mappedUser: User = {
      id: supabaseUser.id,
      email: profileData.email,
      name: profileData.name,
      role: profileData.role as UserRole,
      storeIds: storeIds,
      avatar: profileData.avatar || undefined,
    };
    
    console.log('Mapped user:', mappedUser.name, 'with role:', mappedUser.role);
    return mappedUser;
  } catch (error) {
    console.error("Error mapping profile:", error);
    throw error;
  }
};
