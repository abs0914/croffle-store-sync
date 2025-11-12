import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/format";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { AddCommissaryItemDialog } from "@/pages/Inventory/components/AddCommissaryItemDialog";
import { InventoryItemCard } from "@/pages/CommissaryInventory/components/InventoryItemCard";
import { EditCommissaryItemDialog } from "@/pages/Inventory/components/EditCommissaryItemDialog";
import { StockAdjustmentDialog } from "@/pages/CommissaryInventory/components/StockAdjustmentDialog";
import { DeleteCommissaryItemDialog } from "@/components/commissary/DeleteCommissaryItemDialog";
import { deleteCommissaryInventoryItem } from "@/services/inventoryManagement/commissaryInventoryService";
import { CommissaryInventoryItem, CommissaryInventoryFilters } from "@/types/inventoryManagement";
import { CommissaryInventoryFiltersComponent } from "@/pages/CommissaryInventory/components/CommissaryInventoryFilters";
import { useCommissaryInventory } from "@/pages/CommissaryInventory/hooks/useCommissaryInventory";

interface CommissaryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_threshold: number;
  unit_cost: number;
  last_purchase_date?: string;
  supplier?: {
    name: string;
  };
}
export function CommissaryInventoryTab() {
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

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editItem, setEditItem] = useState<CommissaryInventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<CommissaryInventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CommissaryInventoryItem | null>(null);

  // Filter items based on current filters
  const getFilteredItems = () => {
    let filteredItems = items;

    // Filter by search term
    if (filters.search) {
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filter by item type
    if (filters.item_type && filters.item_type !== 'all') {
      filteredItems = filteredItems.filter(item => item.item_type === filters.item_type);
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === filters.category);
    }

    // Filter by stock level
    if (filters.stockLevel && filters.stockLevel !== 'all') {
      filteredItems = filteredItems.filter(item => {
        switch (filters.stockLevel) {
          case 'good':
            return item.current_stock > item.minimum_threshold;
          case 'low':
            return item.current_stock <= item.minimum_threshold && item.current_stock > 0;
          case 'out':
            return item.current_stock <= 0;
          default:
            return true;
        }
      });
    }

    // Filter by supplier
    if (filters.supplier) {
      filteredItems = filteredItems.filter(item => item.supplier_id === filters.supplier);
    }

    // Filter by expiring status
    if (filters.expiring && filters.expiring !== 'all') {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      filteredItems = filteredItems.filter(item => {
        if (!item.expiry_date) return filters.expiring !== 'expiring_soon' && filters.expiring !== 'expired';
        
        const expiryDate = new Date(item.expiry_date);
        
        switch (filters.expiring) {
          case 'expiring_soon':
            return expiryDate <= thirtyDaysFromNow && expiryDate > today;
          case 'expired':
            return expiryDate <= today;
          default:
            return true;
        }
      });
    }

    // Sort items
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    
    filteredItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'stock':
          aValue = a.current_stock;
          bValue = b.current_stock;
          break;
        case 'expiry_date':
          aValue = a.expiry_date ? new Date(a.expiry_date).getTime() : 0;
          bValue = b.expiry_date ? new Date(b.expiry_date).getTime() : 0;
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        default: // name
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredItems;
  };

  const filteredItems = getFilteredItems();
  const lowStockItems = items.filter(item => item.current_stock <= item.minimum_threshold);

  const handleEdit = (item: CommissaryInventoryItem) => {
    setEditItem(item);
    setShowEditDialog(true);
  };

  const handleStockAdjust = (item: CommissaryInventoryItem) => {
    setAdjustItem(item);
    setShowStockDialog(true);
  };

  const handleDelete = (item: CommissaryInventoryItem) => {
    setDeleteItem(item);
    setShowDeleteDialog(true);
  };

  const handleDeleteSuccess = () => {
    loadData();
    setShowDeleteDialog(false);
    setDeleteItem(null);
  };

  const handleAddSuccess = () => {
    loadData();
    toast.success('Item added successfully');
  };

  const handleEditSuccess = () => {
    loadData();
    setShowEditDialog(false);
    setEditItem(null);
  };

  const handleAdjustSuccess = () => {
    loadData();
    setShowStockDialog(false);
    setAdjustItem(null);
  };

  if (!hasAdminAccess) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Commissary inventory management is only available to administrators, owners, and managers.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Low Stock</div>
            </div>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(items.reduce((sum, item) => sum + item.current_stock * item.unit_cost, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div className="text-2xl font-bold">
              {new Set(items.map(item => item.category)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <CommissaryInventoryFiltersComponent
        filters={filters}
        setFilters={setFilters}
        suppliers={suppliers}
        items={items}
      />

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Commissary Inventory
              {filteredItems.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredItems.length} items)
                </span>
              )}
            </CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading commissary inventory...</p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {items.length === 0 ? 'No commissary items' : 'No items found'}
              </h3>
              <p className="text-muted-foreground">
                {items.length === 0 
                  ? 'No commissary inventory items have been added yet' 
                  : 'Try adjusting your filter criteria'}
              </p>
              {items.length === 0 && (
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map(item => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onStockAdjustment={handleStockAdjust}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddCommissaryItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={handleAddSuccess}
      />
      
      <EditCommissaryItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={editItem}
        onSuccess={handleEditSuccess}
      />
      
      <StockAdjustmentDialog
        open={showStockDialog}
        onOpenChange={setShowStockDialog}
        item={adjustItem}
        onSuccess={handleAdjustSuccess}
      />
      
      <DeleteCommissaryItemDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={deleteItem}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}