
import { User, UserRole } from "@/types";
import { supabase } from "@/integrations/supabase/client";

// Constants for Supabase URLs
const SUPABASE_URL = "https://bwmkqscqkfoezcuzgpwq.supabase.co";

// Function to convert Supabase profile data to our app's User type
export const mapProfileToUser = async (supabaseUser: any): Promise<User | null> => {
  if (!supabaseUser) return null;
  
  try {
    console.log('Mapping user profile for ID:', supabaseUser.id);
    
    // First check if the profile exists
    let { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Unable to retrieve user profile");
    }
    
    // If profile doesn't exist, try to set up the user account
    if (!profileData) {
      console.log('Profile not found, attempting to create one via edge function');
      try {
        // Call the setup-users edge function to create missing profiles
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/setup-users`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: supabaseUser.id }),
        });
        
        console.log('Edge function response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to set up user account:', errorText);
          throw new Error(`Failed to set up user account: ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('Edge function response:', responseData);
      } catch (fetchError) {
        console.error('Error calling edge function:', fetchError);
        throw new Error(`Error calling edge function: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
      
      // Try fetching profile again
      const { data: newProfileData, error: newProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();
        
      if (newProfileError) {
        console.error("Profile refetch error:", newProfileError);
        throw new Error("Unable to retrieve created user profile");
      }
      
      if (!newProfileData) {
        console.error("Profile still not found after creation attempt");
        throw new Error("Profile creation failed - no data returned");
      }
      
      console.log('Profile created successfully:', newProfileData);
      
      // Use the newly created profile data
      profileData = newProfileData;
    }
    
    console.log('Profile data found:', profileData);
    
    // Fetch the user's store access
    const { data: storeAccess, error: storeError } = await supabase
      .from('user_store_access')
      .select('store_id')
      .eq('user_id', supabaseUser.id);
    
    if (storeError) {
      console.error("Store access fetch error:", storeError);
      // Don't throw here, just use empty array for store IDs
    }
    
    console.log('Store access:', storeAccess);
    
    // Map the data to our User type
    const mappedUser = {
      id: supabaseUser.id,
      email: profileData.email,
      name: profileData.name,
      role: profileData.role as UserRole,
      storeIds: storeAccess?.map(access => access.store_id) || [],
      avatar: profileData.avatar || undefined,
    };
    
    console.log('Mapped user:', mappedUser);
    return mappedUser;
  } catch (error) {
    console.error("Error mapping profile:", error);
    throw error;
  }
};
