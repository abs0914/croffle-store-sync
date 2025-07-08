
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth";
import { CommissaryInventoryTab } from "./components/CommissaryInventoryTab";
import { CommissaryPurchasesTab } from "./components/CommissaryPurchasesTab";
import { SupplierManagementTab } from "./components/SupplierManagementTab";
import { Warehouse, ShoppingCart, Users, BarChart3 } from "lucide-react";

export default function CommissaryManagement() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");

  if (!user || (!hasPermission('admin') && !hasPermission('owner'))) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              You don't have permission to access Commissary Management.
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Warehouse className="h-8 w-8" />
            Commissary Management
          </h1>
          <p className="text-muted-foreground">
            Manage raw materials, supplier relationships, and purchasing
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchases
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <CommissaryInventoryTab />
        </TabsContent>

        <TabsContent value="purchases">
          <CommissaryPurchasesTab />
        </TabsContent>

        <TabsContent value="suppliers">
          <SupplierManagementTab />
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Commissary Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analytics dashboard coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
