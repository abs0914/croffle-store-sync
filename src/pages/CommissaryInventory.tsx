import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Building2, ShoppingCart } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { useCommissaryInventory } from "./CommissaryInventory/hooks/useCommissaryInventory";
import { CommissaryInventoryHeader } from "./CommissaryInventory/components/CommissaryInventoryHeader";
import { CommissaryInventoryFiltersComponent } from "./CommissaryInventory/components/CommissaryInventoryFilters";
import { InventoryTab } from "./CommissaryInventory/components/InventoryTab";
import { PurchasingTab } from "./CommissaryInventory/components/PurchasingTab";
import { SuppliersTab } from "./CommissaryInventory/components/SuppliersTab";
import { AddCommissaryItemDialog } from "./CommissaryInventory/components/AddCommissaryItemDialog";
import { EditCommissaryItemDialog } from "./CommissaryInventory/components/EditCommissaryItemDialog";
import { StockAdjustmentDialog } from "./CommissaryInventory/components/StockAdjustmentDialog";
import { DeleteConfirmationDialog } from "./CommissaryInventory/components/DeleteConfirmationDialog";
import { DataSyncPanel } from "./CommissaryInventory/components/DataSyncPanel";

export default function CommissaryInventory() {
  const {
    items,
    suppliers,
    loading,
    filters,
    setFilters,
    hasAdminAccess,
    loadData,
    handleDeleteItem,
    handleStockAdjustment
  } = useCommissaryInventory();

  const [activeTab, setActiveTab] = useState("inventory");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CommissaryInventoryItem | null>(null);

  const handleEditItem = (item: CommissaryInventoryItem) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleStockAdjustmentItem = (item: CommissaryInventoryItem) => {
    setSelectedItem(item);
    setShowStockDialog(true);
  };

  const handleDeleteItemDialog = (item: CommissaryInventoryItem) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleItemDialogSuccess = async () => {
    await loadData();
  };

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Commissary inventory management is only available to administrators and owners.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <CommissaryInventoryHeader />

      {/* Add the data sync panel at the top for debugging */}
      <DataSyncPanel />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="purchasing" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchasing
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <div className="space-y-6">
            <CommissaryInventoryFiltersComponent
              filters={filters}
              setFilters={setFilters}
              suppliers={suppliers}
              items={items}
            />

            <InventoryTab
              items={items}
              loading={loading}
              filters={filters}
              onAddItem={() => setShowAddDialog(true)}
              onEditItem={handleEditItem}
              onStockAdjustment={handleStockAdjustmentItem}
              onDeleteItem={handleDeleteItemDialog}
            />
          </div>
        </TabsContent>

        <TabsContent value="purchasing">
          <Card>
            <CardContent className="p-6">
              <PurchasingTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardContent className="p-6">
              <SuppliersTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddCommissaryItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleItemDialogSuccess}
      />

      <EditCommissaryItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={selectedItem}
        onSuccess={handleItemDialogSuccess}
      />

      <StockAdjustmentDialog
        open={showStockDialog}
        onOpenChange={setShowStockDialog}
        item={selectedItem}
        onSuccess={handleItemDialogSuccess}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={selectedItem}
        onSuccess={handleItemDialogSuccess}
      />
    </div>
  );
}
