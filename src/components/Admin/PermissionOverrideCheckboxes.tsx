import React from 'react';
import { RolePermissions, resolveUserPermissions, getUserRoleDefinition } from '@/types/rolePermissions';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, Shield, Package, Factory, ShoppingCart, DollarSign, ChefHat, FileText, Settings, UserPlus, BarChart3, CreditCard } from 'lucide-react';

interface PermissionOverrideCheckboxesProps {
  role: string;
  customPermissions?: Partial<RolePermissions>;
  onPermissionChange: (permission: keyof RolePermissions, enabled: boolean | null) => void;
  disabled?: boolean;
}

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

const PERMISSION_LABELS = {
  pos: 'Point of Sale',
  dashboard: 'Dashboard',
  inventory_management: 'Inventory Management',
  commissary_inventory: 'Commissary Inventory',
  production_management: 'Production Management',
  order_management: 'Order Management',
  expenses: 'Expenses',
  recipe_management: 'Recipe Management',
  reports: 'Reports',
  settings: 'Settings',
  user_management: 'User Management',
  purchasing: 'Purchasing',
};

const PERMISSION_GROUPS = {
  'Core Operations': ['pos', 'dashboard'] as (keyof RolePermissions)[],
  'Inventory & Stock': ['inventory_management', 'commissary_inventory', 'purchasing'] as (keyof RolePermissions)[],
  'Production & Recipes': ['production_management', 'recipe_management'] as (keyof RolePermissions)[],
  'Business Management': ['order_management', 'expenses', 'reports'] as (keyof RolePermissions)[],
  'Administration': ['settings', 'user_management'] as (keyof RolePermissions)[],
};

export function PermissionOverrideCheckboxes({
  role,
  customPermissions = {},
  onPermissionChange,
  disabled = false
}: PermissionOverrideCheckboxesProps) {
  const roleDefinition = getUserRoleDefinition(role);
  const resolvedPermissions = resolveUserPermissions(role, customPermissions);

  const getPermissionState = (permission: keyof RolePermissions) => {
    const hasCustomOverride = customPermissions.hasOwnProperty(permission);
    const roleDefault = roleDefinition?.permissions[permission] || false;
    const currentValue = resolvedPermissions[permission];

    return {
      hasCustomOverride,
      roleDefault,
      currentValue,
      isOverridden: hasCustomOverride && currentValue !== roleDefault
    };
  };

  const handlePermissionToggle = (permission: keyof RolePermissions, checked: boolean) => {
    const { roleDefault } = getPermissionState(permission);
    
    if (checked === roleDefault) {
      // Remove override (back to role default)
      onPermissionChange(permission, null);
    } else {
      // Set override
      onPermissionChange(permission, checked);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permission Overrides
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Override individual permissions for this user. Changes will take precedence over role defaults.</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
          <div key={groupName} className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">{groupName}</h4>
            <div className="space-y-2">
              {permissions.map((permission) => {
                const { hasCustomOverride, roleDefault, currentValue, isOverridden } = getPermissionState(permission);
                const Icon = PERMISSION_ICONS[permission];

                return (
                  <div key={permission} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {PERMISSION_LABELS[permission]}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant={roleDefault ? "default" : "secondary"} className="text-xs">
                            Role Default: {roleDefault ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {isOverridden && (
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                              Overridden
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={currentValue}
                        onCheckedChange={(checked) => handlePermissionToggle(permission, checked as boolean)}
                        disabled={disabled}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}