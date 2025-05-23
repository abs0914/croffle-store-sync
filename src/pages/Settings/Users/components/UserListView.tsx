
import { useState } from "react";
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { UserRole } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterIcon, UserPlusIcon } from "lucide-react";
import { UsersTable } from "./";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserListViewProps {
  users: AppUser[];
  isLoading: boolean;
  stores: Store[];
  canManageUsers: boolean;
  onAddUser: () => void;
  onEditUser: (user: AppUser) => void;
  onDeleteUser: (user: AppUser) => void;
}

export default function UserListView({ 
  users, 
  isLoading, 
  stores,
  canManageUsers,
  onAddUser, 
  onEditUser, 
  onDeleteUser 
}: UserListViewProps) {
  const [roleFilter, setRoleFilter] = useState<UserRole[]>([]);

  const toggleRoleFilter = (role: UserRole) => {
    setRoleFilter(current => 
      current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role]
    );
  };

  // Filter users by role if filter is active
  const filteredUsers = roleFilter.length > 0
    ? users.filter(user => roleFilter.includes(user.role as UserRole))
    : users;

  return (
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
          <Button onClick={onAddUser} disabled={!canManageUsers}>
            <UserPlusIcon className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <UsersTable 
          users={filteredUsers}
          isLoading={isLoading}
          onAdd={onAddUser}
          onEdit={onEditUser}
          onDelete={onDeleteUser}
          allStores={stores}
        />
      </CardContent>
    </Card>
  );
}
