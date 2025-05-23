
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, ShieldIcon, XCircleIcon, CheckCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/user";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
  allStores: Store[];
}

export default function UsersTable({ 
  users, 
  isLoading, 
  onAdd, 
  onEdit, 
  onDelete,
  onActivate,
  onDeactivate,
  allStores 
}: UsersTableProps) {
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStore, setFilterStore] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const getUserRoleBadge = (role: string) => {
    const badgeClasses = {
      admin: "bg-purple-100 text-purple-800",
      owner: "bg-blue-100 text-blue-800",
      manager: "bg-amber-100 text-amber-800",
      cashier: "bg-green-100 text-green-800"
    };

    const roleType = role as keyof typeof badgeClasses;
    const badgeClass = badgeClasses[roleType] || "bg-gray-100 text-gray-800";

    return (
      <Badge className={badgeClass} variant="outline">
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStoreNames = (storeIds: string[]) => {
    if (!storeIds?.length) return "None";
    
    const storeNames = storeIds.map(id => {
      const store = allStores.find(s => s.id === id);
      return store?.name || "Unknown";
    });
    
    if (storeNames.length <= 2) {
      return storeNames.join(", ");
    }
    
    return `${storeNames[0]}, ${storeNames[1]} +${storeNames.length - 2}`;
  };

  // Filter users based on the filter criteria
  const filteredUsers = users.filter(user => {
    const nameMatch = !filterName || 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(filterName.toLowerCase());
    
    const roleMatch = !filterRole || user.role === filterRole;
    
    const storeMatch = !filterStore || 
      (filterStore === 'none' && (!user.storeIds || user.storeIds.length === 0)) ||
      user.storeIds?.some(id => id === filterStore);
    
    const statusMatch = !filterStatus || 
      (filterStatus === 'active' && user.isActive) || 
      (filterStatus === 'inactive' && !user.isActive);
    
    return nameMatch && roleMatch && storeMatch && statusMatch;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Filter by name"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="cashier">Cashier</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStore} onValueChange={setFilterStore}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All stores</SelectItem>
            <SelectItem value="none">No store</SelectItem>
            {allStores.map(store => (
              <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Assigned Stores</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName || `${user.firstName} ${user.lastName}`}</TableCell>
                  <TableCell>{getUserRoleBadge(user.role)}</TableCell>
                  <TableCell>{user.email || "N/A"}</TableCell>
                  <TableCell>{user.contactNumber || "N/A"}</TableCell>
                  <TableCell>
                    <span className="inline-block max-w-[200px] truncate" title={getStoreNames(user.storeIds)}>
                      {getStoreNames(user.storeIds)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(user)}
                      title="Edit user"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    {user.isActive && onDeactivate ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeactivate(user)}
                        className="text-red-600 hover:text-red-800"
                        title="Deactivate user"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </Button>
                    ) : !user.isActive && onActivate ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onActivate(user)}
                        className="text-green-600 hover:text-green-800"
                        title="Activate user"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(user)}
                      title="Delete user"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6">
                  No users match the current filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
