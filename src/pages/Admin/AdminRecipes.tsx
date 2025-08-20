import React from 'react';
import { SimplifiedRecipeManagement } from '@/components/Admin/recipe/SimplifiedRecipeManagement';
import { CategoryBasedInventoryValidator } from '@/components/Admin/CategoryBasedInventoryValidator';
import { PerformanceMonitor } from '@/components/Admin/PerformanceMonitor';
import { InventoryHealthDashboard } from '@/components/Admin/InventoryHealthDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminRecipes() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Recipe & Inventory Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage recipes, validate inventory categories, monitor performance, and track system health.
        </p>
      </div>
      
      <Tabs defaultValue="recipes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recipes">Recipe Templates</TabsTrigger>
          <TabsTrigger value="validator">Category Validator</TabsTrigger>
          <TabsTrigger value="performance">Performance Monitor</TabsTrigger>
          <TabsTrigger value="health">Inventory Health</TabsTrigger>
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
      </Tabs>
    </div>
  );
}

