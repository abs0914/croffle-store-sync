
import { Dialog } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import InventoryHeader from "./components/InventoryHeader";
import { useInventoryStockData } from "./components/inventoryStock/useInventoryStockData";
import { InventoryStockList } from "./components/inventoryStock/InventoryStockList";
import { AddStockItemForm } from "./components/inventoryStock/AddStockItemForm";
import { EditStockItemForm } from "./components/inventoryStock/EditStockItemForm";
import { StockAdjustmentModal } from "./components/inventoryStock/StockAdjustmentModal";

export default function InventoryStock() {
  const {
    currentStore,
    stockItems,
    isLoading,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isStockModalOpen,
    setIsStockModalOpen,
    currentStockItem,
    createMutation,
    updateMutation,
    stockMutation,
    handleAddStockItem,
    handleUpdateStockItem,
    handleStockAdjustment,
    openEditModal,
    openStockModal
  } = useInventoryStockData();

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Inventory Stock Management</h1>
        <p>Please select a store first</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <InventoryHeader 
        title="Inventory Stock Management" 
        description="Manage your raw materials, ingredients, and supplies"
      />
      
      <div className="flex justify-end mb-4">
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
            stockItems={stockItems}
            isLoading={isLoading}
            onEdit={openEditModal}
            onStockAdjust={openStockModal}
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
