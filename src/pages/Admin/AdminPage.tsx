import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Package, Store, Wrench } from 'lucide-react';
import { UnifiedInventoryDashboard } from '@/components/admin/UnifiedInventoryDashboard';

export const AdminPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Administration</h1>
          <p className="text-muted-foreground">Manage and monitor system operations</p>
        </div>
      </div>

      <Tabs defaultValue="inventory-system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inventory-system" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Inventory System
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="stores" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Stores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory-system">
          <UnifiedInventoryDashboard />
        </TabsContent>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Key metrics and system status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">System dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Management</CardTitle>
              <CardDescription>Manage products and recipes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Product management interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <CardTitle>Store Management</CardTitle>
              <CardDescription>Manage store locations and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Store management interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};