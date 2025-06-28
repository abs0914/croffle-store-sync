
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkUploadTab } from "./ProductionManagement/components/BulkUploadTab";
import { ConversionProcessTab } from "./ProductionManagement/components/ConversionProcessTab";
import { useStore } from "@/contexts/StoreContext";
import { Upload, Package, History } from "lucide-react";

export default function ProductionManagement() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("conversion");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Production Management</h1>
          <p className="text-muted-foreground">
            Convert raw materials into finished products and manage production processes for {currentStore?.name || 'your store'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Conversion Management
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Recipe & Material Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Conversion Management
              </CardTitle>
              <CardDescription>
                Execute conversions from raw materials to finished products. Use uploaded recipes or create custom conversions.
                All finished products created here will be available for store ordering.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionProcessTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Recipe & Material Upload
              </CardTitle>
              <CardDescription>
                Upload conversion recipes and raw materials in bulk to streamline production management.
                Recipes uploaded here can be used in the conversion process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkUploadTab storeId={currentStore?.id || ''} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
