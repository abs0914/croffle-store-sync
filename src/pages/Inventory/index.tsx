import { Button } from '@/components/ui/button';
import { Download, Upload, FileText, Plus } from 'lucide-react';
import { InventoryStats } from './components/inventoryManagement/InventoryStats';
import { InventoryStockList } from './components/inventoryStock/InventoryStockList';
import { AddStockItemForm } from './components/inventoryStock/AddStockItemForm';
import { EditStockItemForm } from './components/inventoryStock/EditStockItemForm';
import { StockAdjustmentModal } from './components/inventoryStock/StockAdjustmentModal';
import { StockTransferModal } from './components/inventoryStock/StockTransferModal';
import { useInventoryStockData } from './components/inventoryStock/useInventoryStockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const InventoryPage = () => {
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
    openDeleteConfirm,
    createMutation,
    updateMutation,
    stockMutation,
    transferMutation,
    deleteMutation
  } = useInventoryStockData();


  if (!currentStore) {
    return (
      <div className="p-6">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Please select a store to manage inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track stock levels and manage inventory items for {currentStore.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <FileText className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <InventoryStats storeId={currentStore.id} />

      {/* Inventory Table */}
      <InventoryStockList
        stockItems={stockItems}
        isLoading={isLoading}
        onEdit={openEditModal}
        onStockAdjust={openStockModal}
        onStockTransfer={openTransferModal}
        onDelete={openDeleteConfirm}
        hasMultipleStores={hasMultipleStores}
      />

      {/* Modals */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
          </DialogHeader>
          <AddStockItemForm
            onSave={handleAddStockItem}
            onCancel={() => setIsAddModalOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          {currentStockItem && (
            <EditStockItemForm
              stockItem={currentStockItem}
              onUpdate={handleUpdateStockItem}
              onCancel={() => setIsEditModalOpen(false)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
          </DialogHeader>
          {currentStockItem && (
            <StockAdjustmentModal
              stockItem={currentStockItem}
              onSave={handleStockAdjustment}
              onCancel={() => setIsStockModalOpen(false)}
              isLoading={stockMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {hasMultipleStores && (
        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transfer Stock</DialogTitle>
            </DialogHeader>
            {currentStockItem && (
              <StockTransferModal
                stockItem={currentStockItem}
                onTransfer={handleStockTransfer}
                onCancel={() => setIsTransferModalOpen(false)}
                isLoading={transferMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentStockItem?.item}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => currentStockItem && handleDeleteStockItem(currentStockItem)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InventoryPage;
