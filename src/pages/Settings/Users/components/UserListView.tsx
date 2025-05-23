
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import UsersTable from "./UsersTable";
import EmptyUsersView from "./EmptyUsersView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCwIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface UserListViewProps {
  users: AppUser[];
  isLoading: boolean;
  stores: Store[];
  canManageUsers: boolean;
  onAddUser: () => void;
  onEditUser: (user: AppUser) => void;
  onDeleteUser: (user: AppUser) => void;
  onActivateUser?: (user: AppUser) => void;
  onDeactivateUser?: (user: AppUser) => void;
  onRefresh: () => void;
  error?: any;
}

export default function UserListView({
  users,
  isLoading,
  stores,
  canManageUsers,
  onAddUser,
  onEditUser,
  onDeleteUser,
  onActivateUser,
  onDeactivateUser,
  onRefresh,
  error
}: UserListViewProps) {
  const hasPermissionIssue = error?.message?.includes('policy') || error?.code === 'PGRST109';

  const renderContent = () => {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Spinner className="h-8 w-8" />
          </CardContent>
        </Card>
      );
    }

    if (error && !hasPermissionIssue) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <p className="text-red-500 mb-4">{error.message || "An error occurred while loading users"}</p>
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (users.length === 0) {
      return (
        <EmptyUsersView 
          onAddUser={onAddUser} 
          onRefresh={onRefresh}
          canManageUsers={canManageUsers} 
          hasRlsPermission={!hasPermissionIssue}
        />
      );
    }

    return (
      <UsersTable
        users={users}
        isLoading={isLoading}
        onAdd={onAddUser}
        onEdit={onEditUser}
        onDelete={onDeleteUser}
        onActivate={onActivateUser}
        onDeactivate={onDeactivateUser}
        allStores={stores}
      />
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCwIcon className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {canManageUsers && (
            <Button size="sm" onClick={onAddUser} disabled={isLoading}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add User
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
