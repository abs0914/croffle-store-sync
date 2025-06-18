
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryPrepTab } from "./ProductionManagement/components/InventoryPrepTab";
import { ProductionDashboard } from "./ProductionManagement/components/ProductionDashboard";
import { useStore } from "@/contexts/StoreContext";
import { ChefHat, BarChart3 } from "lucide-react";

export default function ProductionManagement() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ChefHat className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Inventory Prep & Conversions</h1>
          <p className="text-muted-foreground">
            Manage bulk preparation and inventory conversions for {currentStore?.name || 'your store'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="prep" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Inventory Prep
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Production Overview</CardTitle>
              <CardDescription>
                Monitor preparation activity, inventory usage, and production efficiency for store operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductionDashboard storeId={currentStore?.id || ""} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prep">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Preparation</CardTitle>
              <CardDescription>
                Execute bulk preparation and simple inventory conversions for store readiness.
                Complex recipes are handled through the Product Catalog.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryPrepTab storeId={currentStore?.id || ""} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
