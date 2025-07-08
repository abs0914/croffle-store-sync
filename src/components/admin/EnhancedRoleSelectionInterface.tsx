import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UserRoleIndicator } from '@/components/auth/UserRoleIndicator';
import { getUserRoleDefinition, getRolesByHierarchy, USER_ROLE_DEFINITIONS } from '@/types/rolePermissions';
import { useAuth } from '@/contexts/auth';
import { Shield, Crown, Package, Factory, Users, CreditCard, AlertCircle, ChevronDown, Eye, Settings, FileText, ShoppingCart, DollarSign, ChefHat, BarChart3, UserPlus } from 'lucide-react';

interface EnhancedRoleSelectionProps {
  selectedRole: string;
  onRoleChange: (role: string) => void;
  disabled?: boolean;
  currentUserRole?: string;
  showPermissions?: boolean;
  showImpactPreview?: boolean;
}

const ROLE_ICONS = {
  admin: Shield,
  owner: Crown,
  stock_user: Package,
  production_user: Factory,
  manager: Users,
  cashier: CreditCard,
};

const PERMISSION_ICONS = {
  pos: CreditCard,
  dashboard: BarChart3,
  inventory_management: Package,
  commissary_inventory: Package,
  production_management: Factory,
  order_management: ShoppingCart,
  expenses: DollarSign,
  recipe_management: ChefHat,
  reports: FileText,
  settings: Settings,
  user_management: UserPlus,
  purchasing: ShoppingCart,
};

const PERMISSION_GROUPS = {
  'Core Operations': ['pos', 'dashboard'],
  'Inventory & Stock': ['inventory_management', 'commissary_inventory', 'purchasing'],
  'Production & Recipes': ['production_management', 'recipe_management'],
  'Business Management': ['order_management', 'expenses', 'reports'],
  'Administration': ['settings', 'user_management'],
};

export function EnhancedRoleSelectionInterface({
  selectedRole,
  onRoleChange,
  disabled = false,
  currentUserRole,
  showPermissions = true,
  showImpactPreview = true
}: EnhancedRoleSelectionProps) {
  const { user } = useAuth();
  const [showPermissionDetails, setShowPermissionDetails] = useState(false);
  const userRole = currentUserRole || user?.role;
  const userRoleDefinition = getUserRoleDefinition(userRole || '');
  
  // Only allow assignment of roles with equal or lower hierarchy
  const availableRoles = getRolesByHierarchy().filter(role => {
    if (!userRoleDefinition) return true;
    return role.hierarchy <= userRoleDefinition.hierarchy;
  });

  const selectedRoleDefinition = getUserRoleDefinition(selectedRole);

  const getImpactPreview = () => {
    if (!selectedRoleDefinition) return { canDo: [], cannotDo: [] };
    
    const permissions = selectedRoleDefinition.permissions;
    const canDo: string[] = [];
    const cannotDo: string[] = [];

    Object.entries(permissions).forEach(([permission, hasAccess]) => {
      const readableName = permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (hasAccess) {
        canDo.push(readableName);
      } else {
        cannotDo.push(readableName);
      }
    });

    return { canDo, cannotDo };
  };

  const { canDo, cannotDo } = getImpactPreview();

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium">User Role</label>
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
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">{role.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            You can only assign roles with equal or lower privileges than your own
          </div>
        )}
      </div>

      {/* Impact Preview */}
      {showImpactPreview && selectedRoleDefinition && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Role Impact Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-2">This user will be able to:</h4>
              <div className="flex flex-wrap gap-1">
                {canDo.map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
            {cannotDo.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">This user will NOT be able to:</h4>
                <div className="flex flex-wrap gap-1">
                  {cannotDo.map((permission) => (
                    <Badge key={permission} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Permissions */}
      {showPermissions && selectedRoleDefinition && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserRoleIndicator role={selectedRole} size="sm" showTooltip={false} />
                Role Permissions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPermissionDetails(!showPermissionDetails)}
                className="h-8 w-8 p-0"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showPermissionDetails ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <Collapsible open={showPermissionDetails} onOpenChange={setShowPermissionDetails}>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
                {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => {
                  const groupPermissions = permissions.filter(permission => 
                    permission in selectedRoleDefinition.permissions
                  );
                  
                  if (groupPermissions.length === 0) return null;
                  
                  return (
                    <div key={groupName} className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">{groupName}</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {groupPermissions.map((permission) => {
                          const hasAccess = selectedRoleDefinition.permissions[permission as keyof typeof selectedRoleDefinition.permissions];
                          const IconComponent = PERMISSION_ICONS[permission as keyof typeof PERMISSION_ICONS] || Shield;
                          
                          return (
                            <div key={permission} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30">
                              <div className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <IconComponent className="h-4 w-4 text-muted-foreground" />
                              <span className={hasAccess ? 'text-foreground' : 'text-muted-foreground'}>
                                {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}