import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import InventoryHeader from "./components/InventoryHeader";
import { useInventoryStockData } from "./components/inventoryStock/useInventoryStockData";
import { InventoryStockList } from "./components/inventoryStock/InventoryStockList";
import { AddStockItemForm } from "./components/inventoryStock/AddStockItemForm";
import { EditStockItemForm } from "./components/inventoryStock/EditStockItemForm";
import { StockAdjustmentModal } from "./components/inventoryStock/StockAdjustmentModal";
import { StockTransferModal } from "./components/inventoryStock/StockTransferModal";
// Removed ProactiveReorderingSystem import as it was deleted
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function InventoryStock() {
  const {
    currentStore,
    stockItems,
    isLoading,
    hasMultipleStores,
    
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isStockModalOpen,
    setIsStockModalOpen,
    isTransferModalOpen,
    setIsTransferModalOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    
    currentStockItem,
    
    createMutation,
    updateMutation,
    stockMutation,
    transferMutation,
    deleteMutation,
    
    handleAddStockItem,
    handleUpdateStockItem,
    handleStockAdjustment,
    handleStockTransfer,
    handleDeleteStockItem,
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate,
    
    openEditModal,
    openStockModal,
    openTransferModal,
    openDeleteConfirm
  } = useInventoryStockData();

  const [filterTab, setFilterTab] = useState<"all" | "active" | "inactive" | "low-stock">("all");
  const [activeTab, setActiveTab] = useState("inventory");
  
  const filteredStockItems = stockItems.filter(item => {
    switch (filterTab) {
      case "active":
        return item.is_active;
      case "inactive":
        return !item.is_active;
      case "low-stock":
        return item.stock_quantity <= 10;
      default:
        return true;
    }
  });

  // Calculate reorder alerts count
  const reorderAlertsCount = stockItems.filter(item => 
    item.stock_quantity <= (item.minimum_threshold || 10)
  ).length;

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Store Inventory Management</h1>
        <p>Please select a store first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryHeader
        title="Store Inventory Management"
        description="Manage operational inventory including raw materials, supplies, and finished goods for your store operations."
      />

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Operational Inventory</h3>
        <p className="text-sm text-blue-700 mb-2">
          Track inventory items needed for daily operations at {currentStore.name}. 
          This includes:
        </p>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Raw materials and ingredients</li>
          <li>Packaging supplies and consumables</li>
          <li>Finished goods ready for sale</li>
          <li>Equipment and operational supplies</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2 italic">
          Note: Menu items and product catalog management is handled in the Admin Panel.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory">Inventory Stock</TabsTrigger>
          <TabsTrigger value="reordering" className="flex items-center gap-2">
            Reorder Alerts
            {reorderAlertsCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {reorderAlertsCount}
                </span>
              </div>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <Tabs defaultValue="all" value={filterTab} onValueChange={(v) => setFilterTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
                <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
              </TabsList>
            </Tabs>
          
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-croffle-accent hover:bg-croffle-accent/90"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Inventory Item
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <InventoryStockList 
                stockItems={filteredStockItems}
                isLoading={isLoading}
                onEdit={openEditModal}
                onStockAdjust={openStockModal}
                onStockTransfer={hasMultipleStores ? openTransferModal : undefined}
                onDelete={openDeleteConfirm}
                hasMultipleStores={hasMultipleStores}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reordering">
          <div className="text-center p-8 text-muted-foreground">
            Proactive reordering system is not available in this simplified version.
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Inventory Item Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AddStockItemForm 
          onSave={handleAddStockItem}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Dialog>

      {/* Edit Inventory Item Modal */}
      {currentStockItem && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <EditStockItemForm
            stockItem={currentStockItem}
            onUpdate={handleUpdateStockItem}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={updateMutation.isPending}
          />
        </Dialog>
      )}

      {/* Stock Adjustment Modal */}
      {currentStockItem && (
        <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
          <StockAdjustmentModal
            stockItem={currentStockItem}
            onSave={handleStockAdjustment}
            onCancel={() => setIsStockModalOpen(false)}
            isLoading={stockMutation.isPending}
          />
        </Dialog>
      )}
      
      {/* Stock Transfer Modal */}
      {currentStockItem && hasMultipleStores && (
        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
          <StockTransferModal
            stockItem={currentStockItem}
            onTransfer={handleStockTransfer}
            onCancel={() => setIsTransferModalOpen(false)}
            isLoading={transferMutation.isPending}
          />
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {currentStockItem && (
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Inventory Item</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{currentStockItem.item}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleDeleteStockItem(currentStockItem)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
