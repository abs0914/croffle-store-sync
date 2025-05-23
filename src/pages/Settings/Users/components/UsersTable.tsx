
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon, PlusCircleIcon, KeyIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
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

interface UsersTableProps {
  users: AppUser[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  allStores: Store[];
}

export default function UsersTable({ 
  users, 
  isLoading, 
  onAdd, 
  onEdit, 
  onDelete,
  allStores 
}: UsersTableProps) {
  
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
    if (!storeIds.length) return "None";
    
    const storeNames = storeIds.map(id => {
      const store = allStores.find(s => s.id === id);
      return store?.name || "Unknown";
    });
    
    if (storeNames.length <= 2) {
      return storeNames.join(", ");
    }
    
    return `${storeNames[0]}, ${storeNames[1]} +${storeNames.length - 2}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No users found.</p>
        <Button onClick={onAdd} variant="outline" className="mt-4">
          <PlusCircleIcon className="mr-2 h-4 w-4" />
          Add your first user
        </Button>
      </div>
    );
  }

  return (
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
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.fullName}</TableCell>
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
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(user)}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
