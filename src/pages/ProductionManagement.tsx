import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversionProcessTab } from "./ProductionManagement/components/ConversionProcessTab";
// BulkUploadTab and InventoryConversion removed - using simplified direct recipe system
import { useStore } from "@/contexts/StoreContext";
import { Upload, Package, History, ArrowRightLeft } from "lucide-react";
export default function ProductionManagement() {
  const {
    currentStore
  } = useStore();
  const [activeTab, setActiveTab] = useState("conversion");
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Production Management</h1>
          <p className="text-muted-foreground">
            Convert raw materials into finished products and manage production processes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        

        <TabsContent value="conversion">
          <Card>
            
            <CardContent>
              <ConversionProcessTab />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs removed - using simplified direct recipe system */}
      </Tabs>
    </div>;
}