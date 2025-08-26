import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserRoleIndicator } from "@/components/auth/UserRoleIndicator";
import { getUserRoleDefinition } from "@/types/rolePermissions";
import UserTableActions from "./UserTableActions";
import { Shield, Crown, Package, Factory, Users, CreditCard, Info, MapPin, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EnhancedUserTableRowProps {
  user: AppUser;
  allStores: Store[];
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onActivate?: (user: AppUser) => void;
  onDeactivate?: (user: AppUser) => void;
}

const ROLE_ICONS = {
  admin: Shield,
  owner: Crown,
  stock_user: Package,
  production_user: Factory,
  manager: Users,
  cashier: CreditCard,
};

export default function EnhancedUserTableRow({
  user,
  allStores,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate
}: EnhancedUserTableRowProps) {
  const roleDefinition = getUserRoleDefinition(user.role);
  const IconComponent = ROLE_ICONS[user.role as keyof typeof ROLE_ICONS] || Shield;

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

  const getPermissionSummary = () => {
    if (!roleDefinition) return [];
    
    const permissions = roleDefinition.permissions;
    const activePermissions = Object.entries(permissions)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([permission]) => permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
    
    return activePermissions;
  };

  const permissionSummary = getPermissionSummary();

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span className="font-medium">
            {user.fullName || `${user.firstName} ${user.lastName}`}
          </span>
          <span className="text-xs text-muted-foreground">
            {user.email || "N/A"}
          </span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-auto p-1 hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <UserRoleIndicator role={user.role} size="sm" showTooltip={false} />
                  <Info className="h-3 w-3 text-muted-foreground" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  <span className="font-medium">{roleDefinition?.name}</span>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {roleDefinition?.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Permissions:</h4>
                  <div className="flex flex-wrap gap-1">
                    {permissionSummary.slice(0, 6).map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                    {permissionSummary.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{permissionSummary.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </TableCell>
      
      <TableCell>{user.contactNumber || "N/A"}</TableCell>
      
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-auto p-1 text-left justify-start">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[150px] truncate">
                  {getStoreNames(user.storeIds)}
                </span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Store Access</h4>
              {user.storeIds?.length ? (
                <div className="space-y-1">
                  {user.storeIds.map(storeId => {
                    const store = allStores.find(s => s.id === storeId);
                    return (
                      <div key={storeId} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {store?.name || "Unknown Store"}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No store access assigned</p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          {user.isActive ? (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-sm text-green-600">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="text-sm text-red-600">Inactive</span>
            </div>
          )}
        </div>
      </TableCell>
      
      <TableCell className="text-muted-foreground text-xs">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "Unknown"}
        </div>
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