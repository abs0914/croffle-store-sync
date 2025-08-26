import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { getUserRoleDefinition, getRolesByHierarchy, USER_ROLE_DEFINITIONS, RolePermissions } from "@/types/rolePermissions";
import { Shield, Crown, Package, Factory, Users, CreditCard, Eye, BarChart3, Settings } from "lucide-react";

const ROLE_ICONS = {
  admin: Shield,
  owner: Crown,
  stock_user: Package,
  production_user: Factory,
  manager: Users,
  cashier: CreditCard,
};

const PERMISSION_GROUPS = {
  'Core Operations': ['pos', 'dashboard'],
  'Inventory & Stock': ['inventory_management', 'commissary_inventory', 'purchasing'],
  'Production & Recipes': ['production_management', 'recipe_management'],
  'Business Management': ['order_management', 'expenses', 'reports'],
  'Administration': ['settings', 'user_management'],
};

export default function PermissionManagementDashboard() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['admin', 'owner']);
  
  const roles = getRolesByHierarchy();
  const allPermissions = Object.keys(USER_ROLE_DEFINITIONS.admin.permissions) as (keyof RolePermissions)[];

  const toggleRoleSelection = (roleKey: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleKey) 
        ? prev.filter(r => r !== roleKey)
        : [...prev, roleKey]
    );
  };

  const getPermissionCoverage = (permission: keyof RolePermissions) => {
    const rolesWithPermission = Object.entries(USER_ROLE_DEFINITIONS)
      .filter(([_, definition]) => definition.permissions[permission])
      .length;
    return (rolesWithPermission / Object.keys(USER_ROLE_DEFINITIONS).length) * 100;
  };

  const getRoleComparison = () => {
    return selectedRoles.map(roleKey => {
      const definition = getUserRoleDefinition(roleKey);
      if (!definition) return null;
      
      const permissionCount = Object.values(definition.permissions).filter(Boolean).length;
      const totalPermissions = Object.keys(definition.permissions).length;
      
      return {
        roleKey,
        definition,
        permissionCount,
        totalPermissions,
        coverage: (permissionCount / totalPermissions) * 100
      };
    }).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Permission Management Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="comparison" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Role Comparison</TabsTrigger>
              <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
              <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              {/* Role Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Select Roles to Compare</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(USER_ROLE_DEFINITIONS).map(([roleKey, definition]) => {
                      const IconComponent = ROLE_ICONS[roleKey as keyof typeof ROLE_ICONS] || Shield;
                      const isSelected = selectedRoles.includes(roleKey);
                      
                      return (
                        <Button
                          key={roleKey}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleRoleSelection(roleKey)}
                          className="flex items-center gap-2"
                        >
                          <IconComponent className="h-4 w-4" />
                          {definition.name}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Role Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getRoleComparison().map((role) => {
                  if (!role) return null;
                  
                  const IconComponent = ROLE_ICONS[role.roleKey as keyof typeof ROLE_ICONS] || Shield;
                  
                  return (
                    <Card key={role.roleKey} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-5 w-5" />
                          <CardTitle className="text-lg">{role.definition.name}</CardTitle>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {role.definition.description}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Permission Coverage</span>
                            <span>{role.permissionCount}/{role.totalPermissions}</span>
                          </div>
                          <Progress value={role.coverage} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => {
                            const groupPermissions = permissions.filter(p => p in role.definition.permissions);
                            const activePermissions = groupPermissions.filter(p => 
                              role.definition.permissions[p as keyof RolePermissions]
                            );
                            
                            if (groupPermissions.length === 0) return null;
                            
                            return (
                              <div key={groupName} className="space-y-1">
                                <h4 className="text-xs font-medium text-muted-foreground">{groupName}</h4>
                                <div className="flex flex-wrap gap-1">
                                  {activePermissions.map(permission => (
                                    <Badge key={permission} variant="secondary" className="text-xs">
                                      {permission.replace('_', ' ')}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="matrix" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Permission Matrix</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Permission</TableHead>
                          {Object.entries(USER_ROLE_DEFINITIONS).map(([roleKey, definition]) => (
                            <TableHead key={roleKey} className="text-center min-w-[100px]">
                              <div className="flex flex-col items-center gap-1">
                                {React.createElement(ROLE_ICONS[roleKey as keyof typeof ROLE_ICONS] || Shield, { className: "h-4 w-4" })}
                                <span className="text-xs">{definition.name}</span>
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="text-center">Coverage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                          <React.Fragment key={groupName}>
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={Object.keys(USER_ROLE_DEFINITIONS).length + 2} className="font-medium text-sm">
                                {groupName}
                              </TableCell>
                            </TableRow>
                            {permissions.map(permission => (
                              <TableRow key={permission}>
                                <TableCell className="font-medium">
                                  {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </TableCell>
                                {Object.entries(USER_ROLE_DEFINITIONS).map(([roleKey, definition]) => (
                                  <TableCell key={roleKey} className="text-center">
                                    <div className="flex justify-center">
                                      {definition.permissions[permission as keyof RolePermissions] ? (
                                        <div className="w-4 h-4 bg-green-500 rounded-full" />
                                      ) : (
                                        <div className="w-4 h-4 bg-gray-300 rounded-full" />
                                      )}
                                    </div>
                                  </TableCell>
                                ))}
                                <TableCell className="text-center">
                                  <div className="flex items-center gap-2">
                                    <Progress 
                                      value={getPermissionCoverage(permission as keyof RolePermissions)} 
                                      className="h-2 flex-1" 
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {Math.round(getPermissionCoverage(permission as keyof RolePermissions))}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Role Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(USER_ROLE_DEFINITIONS).map(([roleKey, definition]) => {
                        const IconComponent = ROLE_ICONS[roleKey as keyof typeof ROLE_ICONS] || Shield;
                        const permissionCount = Object.values(definition.permissions).filter(Boolean).length;
                        const totalPermissions = Object.keys(definition.permissions).length;
                        const percentage = (permissionCount / totalPermissions) * 100;
                        
                        return (
                          <div key={roleKey} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4" />
                                <span className="text-sm font-medium">{definition.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {permissionCount}/{totalPermissions}
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Permission Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-900">Most Restricted</h4>
                        <p className="text-xs text-blue-700 mt-1">
                          Cashier role has the most limited permissions (POS only)
                        </p>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="text-sm font-medium text-green-900">Full Access</h4>
                        <p className="text-xs text-green-700 mt-1">
                          Admin and Owner roles have complete system access
                        </p>
                      </div>
                      
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <h4 className="text-sm font-medium text-orange-900">Specialized Roles</h4>
                        <p className="text-xs text-orange-700 mt-1">
                          Stock and Production users have targeted permissions for specific workflows
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}