
import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth";
import { PurchaseOrdersTab } from "./components/PurchaseOrdersTab";
import { GRNTab } from "./components/GRNTab";
import { ShoppingCart, ClipboardCheck } from "lucide-react";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import CreatePurchaseOrder from "./CreatePurchaseOrder";

function OrderManagementMain() {
  const [activeTab, setActiveTab] = useState("my-orders");
  useOrderNotifications();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">
            Create purchase orders and track deliveries from commissary
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            My Orders
          </TabsTrigger>
          <TabsTrigger value="receiving" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Receiving
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-orders">
          <PurchaseOrdersTab />
        </TabsContent>

        <TabsContent value="receiving">
          <GRNTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function OrderManagement() {
  const { user, hasPermission } = useAuth();
  
  if (!user || (!hasPermission('manager') && !hasPermission('admin') && !hasPermission('owner') && !hasPermission('stock_user') && !hasPermission('cashier'))) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              You don't have permission to access Order Management. This feature is available to cashiers and above.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<OrderManagementMain />} />
      <Route path="create" element={<CreatePurchaseOrder />} />
    </Routes>
  );
}
