
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { fetchAppUsers } from "@/services/appUser";
import { AppUser } from "@/types/appUser";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import {
  UsersTable,
  AddUserDialog,
  EditUserDialog,
  DeleteUserDialog,
  UserProfile,
  UserListView,
  ErrorView,
  LoadingView,
  ActivateUserDialog
} from "./components";
import useUserDebug from "./hooks/useUserDebug";

export default function UsersPage() {
  const { currentStore, stores } = useStore();
  const { hasPermission, user } = useAuth();
  const isAdmin = hasPermission('admin');
  const isOwner = hasPermission('owner');
  const isManager = user?.role === 'manager';
  const canManageUsers = isAdmin || isOwner;
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Debug hook
  useUserDebug({ user, isAdmin, isOwner, canManageUsers, currentStore });
  
  // Fetch users with React Query
  const { 
    data: users = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["app_users", currentStore?.id],
    queryFn: async () => {
      console.log("Fetching users with params:", {
        userRole: user?.role,
        storeId: currentStore?.id
      });
      
      try {
        // The RLS policies will handle appropriate filtering
        const users = currentStore 
          ? await fetchAppUsers(currentStore.id) 
          : await fetchAppUsers();
          
        console.log(`Successfully fetched ${users.length} users`);
        return users;
      } catch (fetchError: any) {
        console.error("Error in users query function:", fetchError);
        toast.error("Failed to load users: " + (fetchError.message || "Unknown error"));
        throw fetchError;
      }
    },
    enabled: !!user,
    retry: 3,
    retryDelay: 1000,
  });

  // Auto refresh when visibility changes or user changes
  useEffect(() => {
    const refreshData = () => {
      if (user) {
        refetch();
      }
    };

    // Refresh on page visibility change (user coming back to tab)
    document.addEventListener('visibilitychange', refreshData);
    
    // Initial refresh
    refreshData();
    
    return () => {
      document.removeEventListener('visibilitychange', refreshData);
    };
  }, [refetch, user]);

  // Handler functions
  const handleAddUser = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleActivateUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeactivating(false);
    setIsActivateDialogOpen(true);
  };
  
  const handleDeactivateUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsDeactivating(true);
    setIsActivateDialogOpen(true);
  };

  // Handle error state
  if (error) {
    return <ErrorView error={error} onRetry={refetch} />;
  }

  // Manager view - only see their own profile
  if (isManager && !canManageUsers) {
    const currentUserData = users.find(u => u.email === user?.email);
    
    if (!currentUserData && !isLoading) {
      return (
        <ErrorView 
          error={new Error("Unable to load your user profile")} 
          onRetry={refetch} 
        />
      );
    }
    
    if (!currentUserData) {
      return <LoadingView />;
    }

    return <UserProfile user={currentUserData} stores={stores} />;
  }

  // Store selection required
  if (!currentStore && !canManageUsers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Please select a store first</div>
        </CardContent>
      </Card>
    );
  }

  // Main user management view
  return (
    <div className="space-y-6">
      <UserListView
        users={users}
        isLoading={isLoading}
        stores={stores}
        canManageUsers={canManageUsers}
        onAddUser={handleAddUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
        onActivateUser={handleActivateUser}
        onDeactivateUser={handleDeactivateUser}
        onRefresh={refetch}
      />

      {/* Dialogs */}
      <AddUserDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        stores={stores}
      />

      <EditUserDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        stores={stores}
      />

      <DeleteUserDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
      />
      
      <ActivateUserDialog
        isOpen={isActivateDialogOpen}
        onOpenChange={setIsActivateDialogOpen}
        user={selectedUser}
        isDeactivating={isDeactivating}
      />
    </div>
  );
}
