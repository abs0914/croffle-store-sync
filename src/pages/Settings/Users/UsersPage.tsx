
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { fetchAppUsers } from "@/services/appUser";
import { AppUser } from "@/types/appUser";
import { UserRole } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlusIcon, FilterIcon } from "lucide-react";
import { 
  UsersTable,
  AddUserDialog,
  EditUserDialog,
  DeleteUserDialog
} from "./components";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole[]>([]);

  // Fetch users for the current store or all stores if admin/owner
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["app_users", canManageUsers ? "all" : currentStore?.id, roleFilter],
    queryFn: () => canManageUsers 
      ? fetchAppUsers() 
      : (currentStore ? fetchAppUsers(currentStore.id) : Promise.resolve([])),
    enabled: canManageUsers || !!currentStore,
    retry: false,
    meta: {
      onError: (err: any) => {
        console.error("Error fetching users:", err);
        toast.error(err?.message || "Failed to load user data");
      }
    }
  });

  // Filter users by role if filter is active
  const filteredUsers = roleFilter.length > 0
    ? users.filter(user => roleFilter.includes(user.role as UserRole))
    : users;

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

  const toggleRoleFilter = (role: UserRole) => {
    setRoleFilter(current => 
      current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role]
    );
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-medium mb-2">Error Loading Users</h2>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "You may not have permission to view users"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Manager should only see their own profile
  if (isManager && !canManageUsers) {
    const currentUserData = users.find(u => u.email === user?.email);
    
    if (!currentUserData) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-medium mb-2">Loading your profile...</h2>
              <p className="text-muted-foreground">Please wait while we retrieve your information.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{currentUserData.firstName} {currentUserData.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{currentUserData.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <p>{currentUserData.contactNumber || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="capitalize">{currentUserData.role}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className={currentUserData.isActive ? "text-green-600" : "text-red-600"}>
                  {currentUserData.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Assigned Stores</p>
              <div className="flex flex-wrap gap-2">
                {currentUserData.storeIds.map(storeId => {
                  const store = stores.find(s => s.id === storeId);
                  return (
                    <span key={storeId} className="px-2 py-1 bg-muted rounded-md text-sm">
                      {store?.name || "Unknown Store"}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentStore && !canManageUsers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Please select a store first</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">User Management</CardTitle>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FilterIcon className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={roleFilter.includes('admin')}
                  onCheckedChange={() => toggleRoleFilter('admin')}
                >
                  Admins
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={roleFilter.includes('owner')}
                  onCheckedChange={() => toggleRoleFilter('owner')}
                >
                  Owners
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={roleFilter.includes('manager')}
                  onCheckedChange={() => toggleRoleFilter('manager')}
                >
                  Managers
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={roleFilter.includes('cashier')}
                  onCheckedChange={() => toggleRoleFilter('cashier')}
                >
                  Cashiers
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAddUser}>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <UsersTable 
            users={filteredUsers}
            isLoading={isLoading}
            onAdd={handleAddUser}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            allStores={stores}
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
