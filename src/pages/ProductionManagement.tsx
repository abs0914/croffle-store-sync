
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionRecipesTab } from "./ProductionManagement/components/ConversionRecipesTab";
import { MenuRecipesTab } from "./ProductionManagement/components/MenuRecipesTab";
import { ProductionDashboard } from "./ProductionManagement/components/ProductionDashboard";
import { BulkUploadTab } from "./ProductionManagement/components/BulkUploadTab";
import { ChefHat, Factory, Upload, BarChart3 } from "lucide-react";

export default function ProductionManagement() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a store to manage production.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Management</h1>
          <p className="text-muted-foreground">
            Manage conversion recipes, menu recipes, and production workflow for {currentStore.name}
          </p>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Production Workflow</h3>
        <p className="text-sm text-blue-700">
          <span className="font-medium">Commissary Inventory</span> → 
          <span className="font-medium"> Conversion Recipes</span> → 
          <span className="font-medium"> Store Inventory</span> → 
          <span className="font-medium"> Menu Recipes</span> → 
          <span className="font-medium"> POS Products</span>
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Conversion Recipes
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Menu Recipes
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ProductionDashboard storeId={currentStore.id} />
        </TabsContent>

        <TabsContent value="conversion">
          <ConversionRecipesTab storeId={currentStore.id} />
        </TabsContent>

        <TabsContent value="menu">
          <MenuRecipesTab storeId={currentStore.id} />
        </TabsContent>

        <TabsContent value="bulk-upload">
          <BulkUploadTab storeId={currentStore.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
