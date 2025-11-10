
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getInventoryMetrics } from '@/services/storeInventory/storeMetricsService';
import { useStore } from '@/contexts/StoreContext';
import { InventoryStockList } from '@/pages/Inventory/components/inventoryStock/InventoryStockList';
import { useInventoryStockData } from '@/pages/Inventory/components/inventoryStock/useInventoryStockData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AddStockItemForm } from '@/pages/Inventory/components/inventoryStock/AddStockItemForm';
import { EditStockItemForm } from '@/pages/Inventory/components/inventoryStock/EditStockItemForm';
import { StockAdjustmentModal } from '@/pages/Inventory/components/inventoryStock/StockAdjustmentModal';
import { StockTransferModal } from '@/pages/Inventory/components/inventoryStock/StockTransferModal';
import { Input } from '@/components/ui/input';
import { Search, Download, Upload } from 'lucide-react';
import { InventoryDeductionDiagnostic } from '@/components/debug/InventoryDeductionDiagnostic';
import { Phase4MonitoringDashboard } from '@/components/monitoring/Phase4MonitoringDashboard';

export default function Inventory() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    isLoading: true
  });

  const {
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
    openDeleteConfirm
  } = useInventoryStockData();

  useEffect(() => {
    if (!currentStore?.id) return;

    const fetchInventoryStats = async () => {
      const metrics = await getInventoryMetrics(currentStore.id);
      setInventoryStats({
        totalItems: metrics.totalItems,
        lowStockItems: metrics.lowStockItems,
        outOfStockItems: metrics.outOfStockItems,
        isLoading: false
      });
    };

    fetchInventoryStats();
  }, [currentStore?.id]);

  // Filter items based on search term and stock level
  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.unit.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStockFilter = (() => {
      switch (stockLevelFilter) {
        case 'low-stock':
          return item.stock_quantity > 0 && item.stock_quantity <= (item.minimum_threshold || 10);
        case 'out-of-stock':
          return item.stock_quantity === 0;
        case 'all':
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStockFilter;
  });

  const handleStockFilterClick = (filter: 'all' | 'low-stock' | 'out-of-stock') => {
    setStockLevelFilter(stockLevelFilter === filter ? 'all' : filter);
  };

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">
              Track stock levels and manage inventory items
            </p>
          </div>
        </div>
        <div className="mt-8 text-center p-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25">
          <div className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No Store Selected</h3>
          <p className="text-muted-foreground mb-4">
            Please select a store from the sidebar to view and manage its inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track stock levels and manage inventory items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Template
          </Button>
          <Button
            variant="outline"
            onClick={handleImportClick}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Total Items</h3>
          <p className="text-2xl font-bold text-blue-600">
            {inventoryStats.isLoading ? '...' : inventoryStats.totalItems}
          </p>
          <p className="text-sm text-muted-foreground">Items in inventory</p>
        </div>
        <button 
          className={`p-6 border rounded-lg text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
            stockLevelFilter === 'low-stock' 
              ? 'border-orange-300 bg-orange-50 shadow-md' 
              : 'hover:border-orange-200'
          }`}
          onClick={() => handleStockFilterClick('low-stock')}
          disabled={inventoryStats.isLoading}
        >
          <h3 className="text-lg font-semibold mb-2">Low Stock</h3>
          <p className="text-2xl font-bold text-orange-600">
            {inventoryStats.isLoading ? '...' : inventoryStats.lowStockItems}
          </p>
          <p className="text-sm text-muted-foreground">
            {stockLevelFilter === 'low-stock' ? 'Click to clear filter' : 'Items below threshold'}
          </p>
        </button>
        <button 
          className={`p-6 border rounded-lg text-left transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
            stockLevelFilter === 'out-of-stock' 
              ? 'border-red-300 bg-red-50 shadow-md' 
              : 'hover:border-red-200'
          }`}
          onClick={() => handleStockFilterClick('out-of-stock')}
          disabled={inventoryStats.isLoading}
        >
          <h3 className="text-lg font-semibold mb-2">Out of Stock</h3>
          <p className="text-2xl font-bold text-red-600">
            {inventoryStats.isLoading ? '...' : inventoryStats.outOfStockItems}
          </p>
          <p className="text-sm text-muted-foreground">
            {stockLevelFilter === 'out-of-stock' ? 'Click to clear filter' : 'Items unavailable'}
          </p>
        </button>
        <div className="p-6 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Active Items</h3>
          <p className="text-2xl font-bold text-green-600">
            {inventoryStats.isLoading ? '...' : (inventoryStats.totalItems - inventoryStats.outOfStockItems)}
          </p>
          <p className="text-sm text-muted-foreground">Items available</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {inventoryStats.lowStockItems > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-800">
              {inventoryStats.lowStockItems} items are running low on stock
            </span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            Consider restocking these items to avoid running out.
          </p>
        </div>
      )}

      {/* Phase 4: Real-time Monitoring Dashboard */}
      <Phase4MonitoringDashboard />
      
      {/* Emergency Diagnostic Component */}
      <InventoryDeductionDiagnostic />

      {/* Search and Inventory List */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-4">
              {stockLevelFilter !== 'all' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStockLevelFilter('all')}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
              <div className="text-sm text-muted-foreground">
                {filteredStockItems.length} of {stockItems.length} items
                {stockLevelFilter !== 'all' && (
                  <span className="ml-1 text-primary font-medium">
                    ({stockLevelFilter === 'low-stock' ? 'Low Stock' : 'Out of Stock'} filtered)
                  </span>
                )}
              </div>
            </div>
          </div>

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

      {/* Modals */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <AddStockItemForm 
          onSave={handleAddStockItem}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={false}
        />
      </Dialog>

      {currentStockItem && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <EditStockItemForm
            stockItem={currentStockItem}
            onUpdate={handleUpdateStockItem}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={false}
          />
        </Dialog>
      )}

      {currentStockItem && (
        <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
          <StockAdjustmentModal
            stockItem={currentStockItem}
            onSave={handleStockAdjustment}
            onCancel={() => setIsStockModalOpen(false)}
            isLoading={false}
          />
        </Dialog>
      )}

      {hasMultipleStores && currentStockItem && (
        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
          <StockTransferModal
            stockItem={currentStockItem}
            onTransfer={handleStockTransfer}
            onCancel={() => setIsTransferModalOpen(false)}
            isLoading={false}
          />
        </Dialog>
      )}

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
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
