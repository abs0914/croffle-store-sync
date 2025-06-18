
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionRecipesTab } from "./ProductionManagement/components/ConversionRecipesTab";
import { ProductionDashboard } from "./ProductionManagement/components/ProductionDashboard";
import { ProductionBulkUploadTab } from "./ProductionManagement/components/ProductionBulkUploadTab";
import { useStore } from "@/contexts/StoreContext";
import { Factory, BarChart3, Upload } from "lucide-react";

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
            Manage production conversions and workflows for {currentStore?.name || 'your store'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="conversions" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Conversions
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>Production Overview</CardTitle>
              <CardDescription>
                Monitor production activity, conversion efficiency, and inventory impact
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
                Convert commissary inventory items into store-ready products. 
                All ingredients are sourced from commissary inventory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionRecipesTab storeId={currentStore?.id || ""} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Production Upload</CardTitle>
              <CardDescription>
                Upload multiple production conversions and workflows using CSV or Excel files.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductionBulkUploadTab storeId={currentStore?.id || ""} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
