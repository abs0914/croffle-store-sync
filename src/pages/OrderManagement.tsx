
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth";
import { PurchaseOrdersTab } from "./OrderManagement/components/PurchaseOrdersTab";
import { DeliveryOrdersTab } from "./OrderManagement/components/DeliveryOrdersTab";
import { GRNTab } from "./OrderManagement/components/GRNTab";
import { AuditTrailTab } from "./OrderManagement/components/AuditTrailTab";
import { ShoppingCart, Truck, ClipboardCheck, History } from "lucide-react";

export default function OrderManagement() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("purchase-orders");

  if (!user || !hasPermission('manager')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              You don't have permission to access Order Management.
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
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            Manage purchase orders, deliveries, and goods received notes
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          {user.role === 'admin' && (
            <TabsTrigger value="delivery-orders" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Delivery Orders
            </TabsTrigger>
          )}
          <TabsTrigger value="grn" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Goods Received
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase-orders">
          <PurchaseOrdersTab />
        </TabsContent>

        {user.role === 'admin' && (
          <TabsContent value="delivery-orders">
            <DeliveryOrdersTab />
          </TabsContent>
        )}

        <TabsContent value="grn">
          <GRNTab />
        </TabsContent>

        <TabsContent value="audit-trail">
          <AuditTrailTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
