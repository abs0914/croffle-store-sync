export interface RolePermissions {
  pos: boolean;
  dashboard: boolean;
  inventory_management: boolean;
  commissary_inventory: boolean;
  production_management: boolean;
  order_management: boolean;
  expenses: boolean;
  recipe_management: boolean;
  reports: boolean;
  settings: boolean;
  user_management: boolean;
  purchasing: boolean;
}

export interface UserRoleDefinition {
  name: string;
  description: string;
  permissions: RolePermissions;
  color: string;
  hierarchy: number; // Higher number = more permissions
}

export const USER_ROLE_DEFINITIONS: Record<string, UserRoleDefinition> = {
  admin: {
    name: 'Admin',
    description: 'Full system access with all administrative privileges',
    permissions: {
      pos: true,
      dashboard: true,
      inventory_management: true,
      commissary_inventory: true,
      production_management: true,
      order_management: true,
      expenses: true,
      recipe_management: true,
      reports: true,
      settings: true,
      user_management: true,
      purchasing: true,
    },
    color: 'bg-red-100 text-red-800 border-red-200',
    hierarchy: 100,
  },
  owner: {
    name: 'Owner',
    description: 'Business owner with full system access',
    permissions: {
      pos: true,
      dashboard: true,
      inventory_management: true,
      commissary_inventory: true,
      production_management: true,
      order_management: true,
      expenses: true,
      recipe_management: true,
      reports: true,
      settings: true,
      user_management: true,
      purchasing: true,
    },
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    hierarchy: 90,
  },
  stock_user: {
    name: 'Stock User',
    description: 'Inventory & Operations management with purchasing authority',
    permissions: {
      pos: false,
      dashboard: true, // Updated: stock_user should have dashboard access
      inventory_management: false,
      commissary_inventory: true, // Already correct
      production_management: true, // Already correct
      order_management: true, // Already correct
      expenses: true, // Already correct
      recipe_management: true, // Already correct
      reports: true, // Updated: stock_user should have reports access
      settings: false,
      user_management: false,
      purchasing: true, // Already correct
    },
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    hierarchy: 50,
  },
  production_user: {
    name: 'Production User',
    description: 'Limited access to production and recipe management only',
    permissions: {
      pos: false,
      dashboard: true, // Updated: production_user should have dashboard access
      inventory_management: false,
      commissary_inventory: true, // Updated: production_user should have commissary access
      production_management: true, // Already correct
      order_management: false,
      expenses: false,
      recipe_management: true, // Already correct
      reports: false,
      settings: false,
      user_management: false,
      purchasing: false,
    },
    color: 'bg-green-100 text-green-800 border-green-200',
    hierarchy: 30,
  },
  manager: {
    name: 'Manager',
    description: 'Store management with inventory and operations access (legacy)',
    permissions: {
      pos: false,
      dashboard: false,
      inventory_management: false,
      commissary_inventory: true,
      production_management: true,
      order_management: true,
      expenses: true,
      recipe_management: true,
      reports: false,
      settings: false,
      user_management: false,
      purchasing: true,
    },
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    hierarchy: 45,
  },
  cashier: {
    name: 'Cashier',
    description: 'Point of Sale and inventory management access',
    permissions: {
      pos: true,
      dashboard: true,
      inventory_management: true,
      commissary_inventory: false,
      production_management: false,
      order_management: false,
      expenses: false,
      recipe_management: false,
      reports: true,
      settings: false,
      user_management: false,
      purchasing: false,
    },
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    hierarchy: 10,
  },
};

export function hasPermission(userRole: string, permission: keyof RolePermissions): boolean {
  const roleDefinition = USER_ROLE_DEFINITIONS[userRole];
  return roleDefinition?.permissions[permission] || false;
}

export function getUserRoleDefinition(role: string): UserRoleDefinition | null {
  return USER_ROLE_DEFINITIONS[role] || null;
}

export function getRolesByHierarchy(): UserRoleDefinition[] {
  return Object.entries(USER_ROLE_DEFINITIONS)
    .map(([key, definition]) => ({ ...definition, key }))
    .sort((a, b) => b.hierarchy - a.hierarchy);
}

export function resolveUserPermissions(role: string, customPermissions?: Partial<RolePermissions>): RolePermissions {
  const roleDefinition = getUserRoleDefinition(role);
  const basePermissions = roleDefinition?.permissions || {
    pos: false,
    dashboard: false,
    inventory_management: false,
    commissary_inventory: false,
    production_management: false,
    order_management: false,
    expenses: false,
    recipe_management: false,
    reports: false,
    settings: false,
    user_management: false,
    purchasing: false,
  };

  // Merge base permissions with custom overrides
  return {
    ...basePermissions,
    ...customPermissions,
  };
}