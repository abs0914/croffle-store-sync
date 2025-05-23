
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import UserTableActions from "./UserTableActions";

interface UserTableRowProps {
  user: AppUser;
  allStores: Store[];
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
}

export default function UserTableRow({
  user,
  allStores,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate
}: UserTableRowProps) {
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

  return (
    <TableRow>
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
        <UserTableActions
          user={user}
          onEdit={onEdit}
          onDelete={onDelete}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
        />
      </TableCell>
    </TableRow>
  );
}
