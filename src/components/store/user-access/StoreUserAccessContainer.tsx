
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRole } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import AddUserForm from "./AddUserForm";
import SearchUsers from "./SearchUsers";
import UserAccessTable from "./UserAccessTable";
import { fetchStoreUsers, toggleUserAccess, addUserByEmail } from "./userAccessService";

interface StoreUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hasAccess: boolean;
}

interface StoreUserAccessContainerProps {
  storeId: string;
}

export default function StoreUserAccessContainer({ storeId }: StoreUserAccessContainerProps) {
  const { user: currentUser, hasPermission } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<StoreUser[]>([]);

  useEffect(() => {
    loadUsers();
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

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const storeUsers = await fetchStoreUsers(storeId);
      setUsers(storeUsers);
      setFilteredUsers(storeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccessToggle = async (userId: string, hasAccess: boolean) => {
    try {
      // Don't modify access for admin users
      const user = users.find(u => u.id === userId);
      if (user?.role === 'admin') {
        toast.info("Admin users have global access by default");
        return;
      }
      
      await toggleUserAccess(userId, storeId, hasAccess);

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
      const newOrUpdatedUser = await addUserByEmail(email, storeId, users);
      
      if (!newOrUpdatedUser) {
        // The service function already displayed the appropriate toast message
        return;
      }

      // Update the users state
      const existingUser = users.find(u => u.id === newOrUpdatedUser.id);
      
      if (existingUser) {
        // Update existing user
        setUsers(prev => 
          prev.map(user => 
            user.id === newOrUpdatedUser.id 
              ? { ...user, hasAccess: true } 
              : user
          )
        );
      } else {
        // Add new user to the list
        setUsers(prev => [...prev, newOrUpdatedUser]);
      }

      toast.success("User access granted");
    } catch (error: any) {
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
            currentUserId={currentUser?.id}
            onToggleAccess={handleAccessToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
