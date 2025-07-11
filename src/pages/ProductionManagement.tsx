
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionProcessTab } from "./ProductionManagement/components/ConversionProcessTab";
// BulkUploadTab and InventoryConversion removed - using simplified direct recipe system
import { useStore } from "@/contexts/StoreContext";
import { Upload, Package, History, ArrowRightLeft } from "lucide-react";

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
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Recipe Management
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

        {/* Other tabs removed - using simplified direct recipe system */}
      </Tabs>
    </div>
  );
}
