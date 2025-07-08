
import { Link } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/auth";
import { useRolePermissions } from "@/contexts/RolePermissionsContext";
import { UserListView, ErrorView, LoadingView } from "./components";
import { useUserDebug, useUsersData, useUserDialogs } from "./hooks";
import UserAccessView from "./components/UserAccessView";
import UserDialogs from "./components/UserDialogs";
import { syncAuthWithAppUsers, updateAppUsersFromAuthMetadata } from "@/services/appUser/sync";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default function UsersPage() {
  const { currentStore, stores } = useStore();
  const { user } = useAuth();
  const { hasPermission, userRole } = useRolePermissions();
  // TEMPORARY FIX: Force admin users to have user management permissions
  const canManageUsers = user?.role === 'admin' || user?.role === 'owner' || hasPermission('user_management');
  
  // Debug logging for permission state
  console.log('🔐 UsersPage - canManageUsers:', canManageUsers);
  console.log('🔐 UsersPage - user from auth:', user);
  console.log('🔐 UsersPage - userRole from permissions:', userRole);

  // Note: Route protection is handled by RoleBasedRouteGuard in the routing configuration
  // No need for redundant permission check here

  // Custom hooks
  const { users, isLoading, error, refetch } = useUsersData();
  const {
    isAddDialogOpen, setIsAddDialogOpen,
    isEditDialogOpen, setIsEditDialogOpen,
    isDeleteDialogOpen, setIsDeleteDialogOpen,
    isActivateDialogOpen, setIsActivateDialogOpen,
    selectedUser, isDeactivating,
    handlers
  } = useUserDialogs();

  // Debug hook
  useUserDebug({ user, canManageUsers, currentStore });

  // Function to handle user synchronization
  const handleSyncUsers = async () => {
    if (!canManageUsers) {
      toast.error("You don't have permission to synchronize users");
      return;
    }

    const loadingToast = toast.loading("Synchronizing users...");

    try {
      console.log("Starting user synchronization process");

      // First try to synchronize any auth users that don't have app_user records
      const result = await syncAuthWithAppUsers();

      if (result.errors.length > 0) {
        console.error("Errors during user sync:", result.errors);
        toast.error(`Some users couldn't be synchronized: ${result.errors.length} errors`);
      } else if (result.created > 0) {
        toast.success(`Successfully synchronized ${result.created} users`);
      } else {
        toast.success("All users are already synchronized");
      }

      // Also update existing users from auth metadata
      const updateResult = await updateAppUsersFromAuthMetadata();
      if (updateResult.updated > 0) {
        toast.success(`Updated ${updateResult.updated} users with auth metadata`);
      }

      // Refresh the user list after synchronization
      console.log("Refreshing user list after synchronization");
      await refetch();
    } catch (error: any) {
      console.error("Failed to synchronize users:", error);
      toast.error(`Synchronization error: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Handle loading state
  if (isLoading && !error) {
    return <LoadingView />;
  }

  // Handle specific database permission errors
  if (error && error instanceof Error && error.message.includes('Database permission error')) {
    return (
      <ErrorView
        error={new Error('Database permission error - Please contact support')}
        onRetry={refetch}
      />
    );
  }

  // Handle error cases
  if (error) {
    return (
      <UserAccessView
        isManager={false}
        isLoading={isLoading}
        error={error as Error}
        currentStoreExists={!!currentStore || canManageUsers}
        users={users}
        currentUserEmail={user?.email}
        stores={stores}
        refetch={refetch}
      />
    );
  }

  // Main user management view for admins and owners
  return (
    <div className="space-y-6">
      <UserListView
        users={users}
        isLoading={isLoading}
        stores={stores}
        canManageUsers={canManageUsers}
        onAddUser={handlers.handleAddUser}
        onEditUser={handlers.handleEditUser}
        onDeleteUser={handlers.handleDeleteUser}
        onActivateUser={handlers.handleActivateUser}
        onDeactivateUser={handlers.handleDeactivateUser}
        onRefresh={refetch}
        onSyncUsers={handleSyncUsers}
      />

      {/* Dialogs - Only render for users with management permissions */}
      {canManageUsers && (
        <UserDialogs
          isAddDialogOpen={isAddDialogOpen}
          isEditDialogOpen={isEditDialogOpen}
          isDeleteDialogOpen={isDeleteDialogOpen}
          isActivateDialogOpen={isActivateDialogOpen}
          selectedUser={selectedUser}
          isDeactivating={isDeactivating}
          stores={stores}
          setIsAddDialogOpen={setIsAddDialogOpen}
          setIsEditDialogOpen={setIsEditDialogOpen}
          setIsDeleteDialogOpen={setIsDeleteDialogOpen}
          setIsActivateDialogOpen={setIsActivateDialogOpen}
        />
      )}
    </div>
  );
}
