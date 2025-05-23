
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/auth";
import { UserListView, ErrorView, LoadingView } from "./components";
import { useUserDebug, useUsersData, useUserDialogs } from "./hooks";
import UserAccessView from "./components/UserAccessView";
import UserDialogs from "./components/UserDialogs";

export default function UsersPage() {
  const { currentStore, stores } = useStore();
  const { hasPermission, user } = useAuth();
  const isAdmin = hasPermission('admin');
  const isOwner = hasPermission('owner');
  const isManager = user?.role === 'manager';
  const canManageUsers = isAdmin || isOwner;
  
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
  useUserDebug({ user, isAdmin, isOwner, canManageUsers, currentStore });
  
  // Handle error state
  if (error) {
    return <ErrorView error={error} onRetry={refetch} />;
  }

  // Handle restricted access views
  const accessView = (
    <UserAccessView
      isManager={isManager && !canManageUsers}
      isLoading={isLoading}
      error={error ? (error as Error) : null}
      currentStoreExists={!!currentStore || canManageUsers}
      users={users}
      currentUserEmail={user?.email}
      stores={stores}
      refetch={refetch}
    />
  );

  if (accessView) return accessView;

  // Main user management view
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
      />

      {/* Dialogs */}
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
    </div>
  );
}
