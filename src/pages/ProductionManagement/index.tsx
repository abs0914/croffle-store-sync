
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkUploadTab } from "./components/BulkUploadTab";
import { ConversionProcessTab } from "./components/ConversionProcessTab";
import { Factory, Upload, Package } from "lucide-react";

interface ProductionManagementProps {
  storeId: string;
}

export default function ProductionManagement({ storeId }: ProductionManagementProps) {
  const [activeTab, setActiveTab] = useState("bulk-upload");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Factory className="h-8 w-8" />
          Production Management
        </h1>
        <p className="text-muted-foreground">
          Manage production processes, bulk uploads, and inventory conversions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Conversion Process
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-upload">
          <BulkUploadTab storeId={storeId} />
        </TabsContent>

        <TabsContent value="conversion">
          <ConversionProcessTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
