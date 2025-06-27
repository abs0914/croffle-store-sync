import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryStockingTab } from "./ProductionManagement/components/InventoryStockingTab";
import { SuppliersTab } from "./ProductionManagement/components/SuppliersTab";
import { BulkUploadTab } from "./ProductionManagement/components/BulkUploadTab";
import { ConversionProcessTab } from "./ProductionManagement/components/ConversionProcessTab";
import { useStore } from "@/contexts/StoreContext";
import { ShoppingCart, Building2, Upload, Package } from "lucide-react";
export default function ProductionManagement() {
  const {
    currentStore
  } = useStore();
  const [activeTab, setActiveTab] = useState("stocking");
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Production Management</h1>
          <p className="text-muted-foreground">
            Manage suppliers, inventory stocking, conversions, and bulk uploads for {currentStore?.name || 'your store'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stocking" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchasing
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Conversion Process
          </TabsTrigger>
          <TabsTrigger value="bulk-upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stocking">
          <Card>
            <CardHeader>
              <CardTitle>Purchasing</CardTitle>
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

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Management</CardTitle>
              <CardDescription>
                Manage external suppliers who provide raw materials and supplies to the commissary.
                The commissary then serves as the internal supplier to individual stores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SuppliersTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Process</CardTitle>
              <CardDescription>
                Convert raw materials into orderable inventory items for store distribution.
                Track material usage and create finished goods ready for store ordering.
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
              <CardTitle>Bulk Upload</CardTitle>
              <CardDescription>
                Upload inventory items, recipes, and conversion templates in bulk to streamline data management.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkUploadTab storeId={currentStore?.id || ''} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>;
}