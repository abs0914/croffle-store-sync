
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, UserRole } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import AddUserForm from "./user-access/AddUserForm";
import SearchUsers from "./user-access/SearchUsers";
import UserAccessTable from "./user-access/UserAccessTable";

interface StoreUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasAccess: boolean;
}

interface StoreUserAccessProps {
  storeId: string;
}

export default function StoreUserAccess({ storeId }: StoreUserAccessProps) {
  const { user: currentUser, hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<StoreUser[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [storeId]);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
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
      const userIdsWithAccess = new Set(storeAccess.map(access => access.user_id));

      // Map profiles to our StoreUser type
      const mappedUsers: StoreUser[] = profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        hasAccess: userIdsWithAccess.has(profile.id)
      }));

      setUsers(mappedUsers);
      setFilteredUsers(mappedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccessToggle = async (userId: string, hasAccess: boolean) => {
    try {
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

      // Update the users state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, hasAccess: !hasAccess } 
            : user
        )
      );

      toast.success(hasAccess 
        ? "User access removed" 
        : "User access granted"
      );
    } catch (error) {
      console.error("Error toggling user access:", error);
      toast.error("Failed to update user access");
    }
  };

  const handleAddUserByEmail = async (email: string) => {
    setIsSubmitting(true);
    try {
      // Check if the user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim())
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        toast.error("User not found with this email");
        return;
      }

      // Check if user already has access
      const existingUser = users.find(u => u.id === profile.id);
      if (existingUser && existingUser.hasAccess) {
        toast.info("This user already has access to this store");
        return;
      }

      // Grant access
      const { error } = await supabase
        .from('user_store_access')
        .insert({
          user_id: profile.id,
          store_id: storeId
        });

      if (error) throw error;

      // Update the users state
      if (existingUser) {
        // Update existing user
        setUsers(prev => 
          prev.map(user => 
            user.id === profile.id 
              ? { ...user, hasAccess: true } 
              : user
          )
        );
      } else {
        // Add new user to the list
        const newUser: StoreUser = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as UserRole,
          hasAccess: true
        };
        setUsers(prev => [...prev, newUser]);
      }

      toast.success("User access granted");
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Failed to grant user access");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current user has permission to manage users
  if (!hasPermission('owner')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Access</CardTitle>
          <CardDescription>
            You don't have permission to manage user access
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage User Access</CardTitle>
        <CardDescription>
          Control which users can access this store
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <AddUserForm 
            isSubmitting={isSubmitting}
            onAddUser={handleAddUserByEmail}
          />

          <SearchUsers
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <UserAccessTable
            users={users}
            filteredUsers={filteredUsers}
            onToggleAccess={handleAccessToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
