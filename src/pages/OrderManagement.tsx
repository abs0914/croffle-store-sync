
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth";
import { PurchaseOrdersTab } from "./OrderManagement/components/PurchaseOrdersTab";
import { GRNTab } from "./OrderManagement/components/GRNTab";
import { AuditTrailTab } from "./OrderManagement/components/AuditTrailTab";
import { OrderMetricsDashboard } from "./OrderManagement/components/OrderMetricsDashboard";
import { ShoppingCart, ClipboardCheck, History, BarChart3 } from "lucide-react";

export default function OrderManagement() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!user || (!hasPermission('manager') && !hasPermission('admin') && !hasPermission('owner'))) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              You don't have permission to access Order Management. This feature is available to managers and above.
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
            {user.role === 'manager' 
              ? "Purchase finished goods from commissary and manage store orders"
              : "Comprehensive order processing from purchase to delivery"
            }
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="grn" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Goods Received
          </TabsTrigger>
          <TabsTrigger value="audit-trail" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <OrderMetricsDashboard />
        </TabsContent>

        <TabsContent value="purchase-orders">
          <PurchaseOrdersTab />
        </TabsContent>

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
