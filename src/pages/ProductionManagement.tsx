
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionRecipesTab } from "./ProductionManagement/components/ConversionRecipesTab";
import { ProductionDashboard } from "./ProductionManagement/components/ProductionDashboard";
import { useStore } from "@/contexts/StoreContext";
import { Factory, BarChart3 } from "lucide-react";

export default function ProductionManagement() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Factory className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Production Management</h1>
          <p className="text-muted-foreground">
            Manage production conversions from commissary inventory to store products for {currentStore?.name || 'your store'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="conversions" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Production Conversions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Production Overview</CardTitle>
              <CardDescription>
                Monitor production activity, conversion efficiency, and inventory impact for store operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductionDashboard storeId={currentStore?.id || ""} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions">
          <Card>
            <CardHeader>
              <CardTitle>Production Conversions</CardTitle>
              <CardDescription>
                Convert commissary inventory items into store-ready products using production conversion workflows. 
                All raw materials are sourced from commissary inventory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionRecipesTab storeId={currentStore?.id || ""} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
