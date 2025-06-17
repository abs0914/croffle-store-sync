
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionRecipesTab } from "./ProductionManagement/components/ConversionRecipesTab";
import { MenuRecipesTab } from "./ProductionManagement/components/MenuRecipesTab";
import { RecipeManagementTab } from "./ProductionManagement/components/RecipeManagementTab";
import { BulkUploadTab } from "./ProductionManagement/components/BulkUploadTab";
import { ProductionDashboard } from "./ProductionManagement/components/ProductionDashboard";
import { useStore } from "@/contexts/StoreContext";

export default function ProductionManagement() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Production Management</h1>
        <p className="text-muted-foreground">
          Manage recipes, conversions, and production workflows for {currentStore?.name || 'your store'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="recipe-management">Recipe Management</TabsTrigger>
          <TabsTrigger value="conversion-recipes">Conversion Recipes</TabsTrigger>
          <TabsTrigger value="menu-recipes">Menu Recipes</TabsTrigger>
          <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ProductionDashboard />
        </TabsContent>

        <TabsContent value="recipe-management">
          <RecipeManagementTab />
        </TabsContent>

        <TabsContent value="conversion-recipes">
          <ConversionRecipesTab />
        </TabsContent>

        <TabsContent value="menu-recipes">
          <MenuRecipesTab />
        </TabsContent>

        <TabsContent value="bulk-upload">
          <BulkUploadTab storeId={currentStore?.id || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
