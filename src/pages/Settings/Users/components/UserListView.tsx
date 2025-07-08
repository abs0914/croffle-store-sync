import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import UsersTable from "./UsersTable";
import EmptyUsersView from "./EmptyUsersView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon, RefreshCwIcon, Users } from "lucide-react";
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
  onSyncUsers?: () => void;
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
  onSyncUsers,
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
    <div className="space-y-4">
      {/* Header with Add User Button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCwIcon className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            
            {canManageUsers && onSyncUsers && (
              <Button variant="outline" size="sm" onClick={onSyncUsers} disabled={isLoading}>
                <RefreshCwIcon className="h-4 w-4 mr-1" />
                Sync Users
              </Button>
            )}
            
            {canManageUsers && (
              <Button 
                size="sm" 
                onClick={onAddUser} 
                disabled={isLoading} 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add New User
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
