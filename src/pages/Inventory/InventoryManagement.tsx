
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryItemsList } from "./components/inventoryManagement/InventoryItemsList";
import { InventoryStats } from "./components/inventoryManagement/InventoryStats";
import { SuppliersTab } from "./components/inventoryManagement/SuppliersTab";
import { RecipesTab } from "./components/inventoryManagement/RecipesTab";
import { OrdersTab } from "./components/inventoryManagement/OrdersTab";
import { StockTransactionsTab } from "./components/inventoryManagement/StockTransactionsTab";

export default function InventoryManagement() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState("items");

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a store to manage inventory.
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
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory, recipes, suppliers, and orders for {currentStore.name}
          </p>
        </div>
      </div>

      <InventoryStats storeId={currentStore.id} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="items">Inventory Items</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <InventoryItemsList storeId={currentStore.id} />
        </TabsContent>

        <TabsContent value="recipes">
          <RecipesTab storeId={currentStore.id} />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>

        <TabsContent value="orders">
          <OrdersTab storeId={currentStore.id} />
        </TabsContent>

        <TabsContent value="transactions">
          <StockTransactionsTab storeId={currentStore.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
