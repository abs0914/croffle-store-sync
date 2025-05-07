
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { toast } from "sonner";

export interface StoreUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasAccess: boolean;
}

/**
 * Fetches all users and checks if they have access to the specified store
 */
export const fetchStoreUsers = async (storeId: string): Promise<StoreUser[]> => {
  // First, get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (profilesError) throw profilesError;

  // Then, get users with access to this store
  const { data: storeAccess, error: accessError } = await supabase
    .from('user_store_access')
    .select('user_id')
    .eq('store_id', storeId);

  if (accessError) throw accessError;

  // Create a set of user IDs with access for quick lookup
  const userIdsWithAccess = new Set(storeAccess?.map(access => access.user_id) || []);

  // Map profiles to our StoreUser type
  const mappedUsers: StoreUser[] = profiles.map(profile => ({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as UserRole,
    hasAccess: profile.role === 'admin' || userIdsWithAccess.has(profile.id)
  }));

  return mappedUsers;
};

/**
 * Toggles a user's access to a store
 */
export const toggleUserAccess = async (
  userId: string, 
  storeId: string, 
  hasAccess: boolean
): Promise<void> => {
  if (hasAccess) {
    // Remove access
    const { error } = await supabase
      .from('user_store_access')
      .delete()
      .eq('user_id', userId)
      .eq('store_id', storeId);

    if (error) throw error;
  } else {
    // Grant access
    const { error } = await supabase
      .from('user_store_access')
      .insert({
        user_id: userId,
        store_id: storeId
      });

    if (error) throw error;
  }
};

/**
 * Adds a user to a store by email
 */
export const addUserByEmail = async (
  email: string, 
  storeId: string, 
  currentUsers: StoreUser[]
): Promise<StoreUser | null> => {
  // Check if the user exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.trim())
    .maybeSingle();

  if (profileError) throw profileError;
  
  if (!profile) {
    toast.error("User not found with this email");
    return null;
  }

  // Admin users automatically have access to all stores
  if (profile.role === 'admin') {
    toast.info("Admin users already have access to all stores");
    return null;
  }

  // Check if user already has access
  const existingUser = currentUsers.find(u => u.id === profile.id);
  if (existingUser && existingUser.hasAccess) {
    toast.info("This user already has access to this store");
    return null;
  }

  // Grant access
  const { error } = await supabase
    .from('user_store_access')
    .insert({
      user_id: profile.id,
      store_id: storeId
    });

  if (error) throw error;

  // Return the new or updated user
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as UserRole,
    hasAccess: true
  };
};
