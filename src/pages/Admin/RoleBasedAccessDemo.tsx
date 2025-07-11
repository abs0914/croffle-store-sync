import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRoleIndicator } from '@/components/auth/UserRoleIndicator';
import { RoleSelectionInterface } from '@/components/admin/RoleSelectionInterface';
import { USER_ROLE_DEFINITIONS, getUserRoleDefinition, hasPermission } from '@/types/rolePermissions';
import { useAuth } from '@/contexts/auth';
import { useRolePermissions } from '@/contexts/RolePermissionsContext';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function RoleBasedAccessDemo() {
  const { user } = useAuth();
  const { permissions, hasPermission: checkPermission } = useRolePermissions();
  const [demoRole, setDemoRole] = useState('admin');

  const demoRoleDefinition = getUserRoleDefinition(demoRole);

  const modulePermissions = [
    { name: 'POS System', key: 'pos' },
    { name: 'Dashboard', key: 'dashboard' },
    { name: 'Inventory Management', key: 'inventory_management' },
    { name: 'Commissary Inventory', key: 'commissary_inventory' },
    { name: 'Production Management', key: 'production_management' },
    { name: 'Order Management', key: 'order_management' },
    { name: 'Expenses', key: 'expenses' },
    { name: 'Recipe Management', key: 'recipe_management' },
    { name: 'Reports', key: 'reports' },
    { name: 'Settings', key: 'settings' },
    { name: 'User Management', key: 'user_management' },
    { name: 'Purchasing', key: 'purchasing' },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role-Based Access Control</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions across the croffle-store-sync system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Your role:</span>
          <UserRoleIndicator role={user?.role || 'unknown'} />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Role Definitions</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
          <TabsTrigger value="demo">Role Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(USER_ROLE_DEFINITIONS).length}</div>
                <p className="text-xs text-muted-foreground">
                  Available user roles in the system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Permissions</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {permissions ? Object.values(permissions).filter(Boolean).length : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Modules you can access
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Role Hierarchy</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getUserRoleDefinition(user?.role || '')?.hierarchy || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your role level (higher = more access)
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Current Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {modulePermissions.map((module) => {
                  const hasAccess = checkPermission(module.key as any);
                  return (
                    <div key={module.key} className="flex items-center gap-2 p-2 rounded-lg border">
                      {hasAccess ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-sm ${hasAccess ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {module.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(USER_ROLE_DEFINITIONS)
              .sort((a, b) => b[1].hierarchy - a[1].hierarchy)
              .map(([roleKey, role]) => (
                <Card key={roleKey}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <UserRoleIndicator role={roleKey} showTooltip={false} />
                        {role.name}
                      </CardTitle>
                      <Badge variant="outline">Level {role.hierarchy}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Object.entries(role.permissions).map(([permission, hasAccess]) => (
                        <div key={permission} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={hasAccess ? 'text-foreground' : 'text-muted-foreground'}>
                            {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete overview of role permissions across all system modules
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Module</th>
                      {Object.entries(USER_ROLE_DEFINITIONS)
                        .sort((a, b) => b[1].hierarchy - a[1].hierarchy)
                        .map(([roleKey, role]) => (
                          <th key={roleKey} className="text-center p-2 font-medium">
                            <UserRoleIndicator role={roleKey} size="sm" showTooltip={false} />
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modulePermissions.map((module) => (
                      <tr key={module.key} className="border-b">
                        <td className="p-2 font-medium">{module.name}</td>
                        {Object.entries(USER_ROLE_DEFINITIONS)
                          .sort((a, b) => b[1].hierarchy - a[1].hierarchy)
                          .map(([roleKey, role]) => (
                            <td key={roleKey} className="text-center p-2">
                              {role.permissions[module.key as keyof typeof role.permissions] ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role Demonstration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a role to see what permissions it would have
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <RoleSelectionInterface
                selectedRole={demoRole}
                onRoleChange={setDemoRole}
                showPermissions={false}
              />

              {demoRoleDefinition && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {modulePermissions.map((module) => {
                      const hasAccess = hasPermission(demoRole, module.key as any);
                      return (
                        <div key={module.key} className={`p-3 rounded-lg border ${
                          hasAccess ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {hasAccess ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm font-medium">{module.name}</span>
                          </div>
                          <span className={`text-xs ${hasAccess ? 'text-green-700' : 'text-gray-500'}`}>
                            {hasAccess ? 'Full Access' : 'No Access'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Role Summary</span>
                    </div>
                    <p className="text-sm text-blue-700">{demoRoleDefinition.description}</p>
                    <div className="mt-2 text-xs text-blue-600">
                      Hierarchy Level: {demoRoleDefinition.hierarchy} | 
                      Permissions: {Object.values(demoRoleDefinition.permissions).filter(Boolean).length}/{modulePermissions.length}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}