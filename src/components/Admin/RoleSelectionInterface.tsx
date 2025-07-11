import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserRoleIndicator } from '@/components/auth/UserRoleIndicator';
import { getUserRoleDefinition, getRolesByHierarchy, USER_ROLE_DEFINITIONS } from '@/types/rolePermissions';
import { useAuth } from '@/contexts/auth';
import { Shield, Crown, Package, Factory, Users, CreditCard, AlertCircle } from 'lucide-react';

interface RoleSelectionInterfaceProps {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  disabled?: boolean;
  currentUserRole?: string;
  showPermissions?: boolean;
}

const ROLE_ICONS = {
  admin: Shield,
  owner: Crown,
  stock_user: Package,
  production_user: Factory,
  manager: Users,
  cashier: CreditCard,
};

export function RoleSelectionInterface({
  selectedRole,
  onRoleChange,
  disabled = false,
  currentUserRole,
  showPermissions = true
}: RoleSelectionInterfaceProps) {
  const { user } = useAuth();
  const userRole = currentUserRole || user?.role;
  const userRoleDefinition = getUserRoleDefinition(userRole || '');
  
  // Only allow assignment of roles with equal or lower hierarchy
  const availableRoles = getRolesByHierarchy().filter(role => {
    if (!userRoleDefinition) return true; // Allow all roles if no user role definition found
    return role.hierarchy <= userRoleDefinition.hierarchy;
  });

  const selectedRoleDefinition = getUserRoleDefinition(selectedRole);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">User Role</label>
        <Select value={selectedRole} onValueChange={onRoleChange} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a role">
              {selectedRoleDefinition && (
                <div className="flex items-center gap-2">
                  {React.createElement(
                    ROLE_ICONS[selectedRole as keyof typeof ROLE_ICONS] || Shield,
                    { className: "h-4 w-4" }
                  )}
                  {selectedRoleDefinition.name}
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((role) => {
              const roleKey = Object.keys(USER_ROLE_DEFINITIONS).find(
                key => USER_ROLE_DEFINITIONS[key].name === role.name
              );
              if (!roleKey) return null;
              
              const IconComponent = ROLE_ICONS[roleKey as keyof typeof ROLE_ICONS] || Shield;
              
              return (
                <SelectItem key={roleKey} value={roleKey}>
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{role.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {role.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        {userRoleDefinition && userRoleDefinition.hierarchy < 100 && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            You can only assign roles with equal or lower privileges than your own
          </div>
        )}
      </div>

      {showPermissions && selectedRoleDefinition && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserRoleIndicator role={selectedRole} size="sm" showTooltip={false} />
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedRoleDefinition.permissions).map(([permission, hasAccess]) => (
                <div key={permission} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={hasAccess ? 'text-foreground' : 'text-muted-foreground'}>
                    {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}