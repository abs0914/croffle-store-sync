
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Package, Truck, FileText, BarChart3 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useStore } from "@/contexts/StoreContext";
import { OrderMetricsDashboard } from "./components/OrderMetricsDashboard";

export default function OrderManagementPage() {
  const { canAccessOrderManagement } = usePermissions();
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("overview");

  // Check permissions
  const orderPermission = canAccessOrderManagement();
  
  if (!orderPermission.hasPermission) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied: {orderPermission.reason}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Order Management</h1>
          <p className="text-muted-foreground">Please select a store to manage orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Manage purchase orders and track deliveries</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Deliveries
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OrderMetricsDashboard />
        </TabsContent>

        <TabsContent value="purchase-orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Purchase orders management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Deliveries tracking coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Order reports coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
