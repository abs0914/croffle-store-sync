
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
        const { data: storeAccess } = await supabase
          .from('user_store_access')
          .select('store_id')
          .eq('user_id', supabaseUser.id);
        
        if (storeAccess && storeAccess.length > 0) {
          storeIds = storeAccess.map(access => access.store_id);
        }
        
        console.log('Store access:', storeAccess);
      } catch (storeError: any) {
        console.error("Error fetching store access:", storeError);
        // Continue with empty storeIds array
      }
    }
    
    // Map the data to our User type
    const mappedUser = {
      id: supabaseUser.id,
      email: profileData.email,
      name: profileData.name,
      role: profileData.role as UserRole,
      storeIds: storeIds,
      avatar: profileData.avatar || undefined,
    };
    
    console.log('Mapped user:', mappedUser);
    return mappedUser;
  } catch (error) {
    console.error("Error mapping profile:", error);
    throw error;
  }
};
