
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryItemsList } from "./components/inventoryManagement/InventoryItemsList";
import { InventoryStats } from "./components/inventoryManagement/InventoryStats";

export default function InventoryManagement() {
  const { currentStore } = useStore();

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
          <h1 className="text-3xl font-bold">Store Inventory</h1>
          <p className="text-muted-foreground">
            View finished goods inventory for {currentStore.name}
          </p>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Store Inventory Overview</h3>
        <p className="text-sm text-blue-700">
          This section shows your store's finished goods inventory. These items are ready for sale in your Point of Sale system.
          Raw materials and recipe management are handled through the Admin panel.
        </p>
      </div>

      <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="font-semibold text-amber-800 mb-2">Need to Order More Products?</h3>
        <p className="text-sm text-amber-700">
          Use the <strong>Order Management</strong> module to request finished goods from the commissary.
          Navigate to Order Management from the main menu to create orders and track deliveries.
        </p>
      </div>

      <InventoryStats storeId={currentStore.id} />
      <InventoryItemsList storeId={currentStore.id} />
    </div>
  );
}
