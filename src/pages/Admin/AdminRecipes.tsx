import React from 'react';
import { SimplifiedRecipeManagement } from '@/components/Admin/recipe/SimplifiedRecipeManagement';
import { CategoryBasedInventoryValidator } from '@/components/Admin/CategoryBasedInventoryValidator';
import { PerformanceMonitor } from '@/components/Admin/PerformanceMonitor';
import { InventoryHealthDashboard } from '@/components/Admin/InventoryHealthDashboard';
import { CroffleDeploymentTool } from '@/components/Admin/CroffleDeploymentTool';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminRecipes() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Recipe & Product Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage recipes, validate inventory categories, monitor performance, track system health, and deploy products.
        </p>
      </div>
      
      <Tabs defaultValue="recipes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="recipes">Recipe Templates</TabsTrigger>
          <TabsTrigger value="validator">Category Validator</TabsTrigger>
          <TabsTrigger value="performance">Performance Monitor</TabsTrigger>
          <TabsTrigger value="health">Inventory Health</TabsTrigger>
          <TabsTrigger value="deployment">Product Deployment</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes">
          <SimplifiedRecipeManagement />
        </TabsContent>

        <TabsContent value="validator">
          <CategoryBasedInventoryValidator />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMonitor />
        </TabsContent>

        <TabsContent value="health">
          <InventoryHealthDashboard />
        </TabsContent>

        <TabsContent value="deployment">
          <CroffleDeploymentTool />
        </TabsContent>
      </Tabs>
    </div>
  );
}

