import { useState } from "react";
import { AppUser } from "@/types/appUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, UserCheck, UserX, ShieldCheck, Trash2 } from "lucide-react";
import { getUserRoleDefinition } from "@/types/rolePermissions";

interface BulkUserActionsProps {
  users: AppUser[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  onBulkActivate: (userIds: string[]) => void;
  onBulkDeactivate: (userIds: string[]) => void;
  onBulkRoleChange: (userIds: string[], newRole: string) => void;
  onBulkDelete: (userIds: string[]) => void;
}

export default function BulkUserActions({
  users,
  selectedUserIds,
  onSelectionChange,
  onBulkActivate,
  onBulkDeactivate,
  onBulkRoleChange,
  onBulkDelete
}: BulkUserActionsProps) {
  const [newRole, setNewRole] = useState<string>("");
  
  const selectedUsers = users.filter(user => selectedUserIds.includes(user.id));
  const allSelected = users.length > 0 && selectedUserIds.length === users.length;
  const someSelected = selectedUserIds.length > 0 && selectedUserIds.length < users.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(users.map(user => user.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleBulkRoleChange = () => {
    if (newRole && selectedUserIds.length > 0) {
      onBulkRoleChange(selectedUserIds, newRole);
      setNewRole("");
    }
  };

  const getRoleDistribution = () => {
    const distribution: Record<string, number> = {};
    selectedUsers.forEach(user => {
      distribution[user.role] = (distribution[user.role] || 0) + 1;
    });
    return distribution;
  };

  const roleDistribution = getRoleDistribution();

  if (users.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Actions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedUserIds.length} of {users.length} selected
            </span>
          </div>
        </div>
      </CardHeader>
      
      {selectedUserIds.length > 0 && (
        <CardContent className="pt-0 space-y-4">
          {/* Selection Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Users by Role:</h4>
            <div className="flex flex-wrap gap-1">
              {Object.entries(roleDistribution).map(([role, count]) => {
                const roleDefinition = getUserRoleDefinition(role);
                return (
                  <Badge key={role} variant="outline" className="text-xs">
                    {roleDefinition?.name || role}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onBulkActivate(selectedUserIds)}
              className="flex items-center gap-1"
            >
              <UserCheck className="h-3 w-3" />
              Activate
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onBulkDeactivate(selectedUserIds)}
              className="flex items-center gap-1"
            >
              <UserX className="h-3 w-3" />
              Deactivate
            </Button>

            <div className="flex items-center gap-2">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="New role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="stock_user">Stock User</SelectItem>
                  <SelectItem value="production_user">Production User</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleBulkRoleChange}
                disabled={!newRole}
                className="flex items-center gap-1"
              >
                <ShieldCheck className="h-3 w-3" />
                Update Role
              </Button>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Users</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedUserIds.length} selected user(s)? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onBulkDelete(selectedUserIds)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Users
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      )}
    </Card>
  );
}