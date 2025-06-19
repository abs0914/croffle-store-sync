
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryPrepTab } from "./ProductionManagement/components/InventoryPrepTab";
import { InventoryStockingTab } from "./ProductionManagement/components/InventoryStockingTab";
import { useStore } from "@/contexts/StoreContext";
import { ChefHat, ShoppingCart } from "lucide-react";

export default function ProductionManagement() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("stocking");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ChefHat className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Inventory Prep & Conversions</h1>
          <p className="text-muted-foreground">
            Manage inventory stocking, bulk preparation and conversions for {currentStore?.name || 'your store'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stocking" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Inventory Stocking
          </TabsTrigger>
          <TabsTrigger value="prep" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Inventory Prep
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stocking">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Stocking</CardTitle>
              <CardDescription>
                Record supplier purchases and manage commissary inventory restocking.
                Track purchase costs, suppliers, and batch information for complete traceability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryStockingTab />
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
