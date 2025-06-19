
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Package, AlertTriangle, CheckCircle, Warehouse, Trash2 } from "lucide-react";
import { CommissaryInventoryItem, CommissaryInventoryFilters } from "@/types/inventoryManagement";
import { 
  fetchCommissaryInventory, 
  getCommissaryStockLevel, 
  getCommissaryStockLevelColor,
  removeDuplicateCommissaryItems
} from "@/services/inventoryManagement/commissaryInventoryService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { useAuth } from "@/contexts/auth";
import { AddCommissaryItemDialog } from "./Inventory/components/AddCommissaryItemDialog";
import { EditCommissaryItemDialog } from "./Inventory/components/EditCommissaryItemDialog";
import { StockAdjustmentDialog } from "./Inventory/components/StockAdjustmentDialog";
import { DeleteConfirmationDialog } from "./Inventory/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";

export default function CommissaryInventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<CommissaryInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CommissaryInventoryItem | null>(null);
  const [filters, setFilters] = useState<CommissaryInventoryFilters>({
    category: 'all',
    stockLevel: 'all',
    supplier: '',
    search: ''
  });

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    if (!hasAdminAccess) {
      toast.error('Access denied. Commissary inventory is only available to administrators.');
      return;
    }
    loadData();
  }, [hasAdminAccess]);

  useEffect(() => {
    if (hasAdminAccess) {
      loadItems();
    }
  }, [filters, hasAdminAccess]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadItems(), loadSuppliers()]);
    } catch (error) {
      console.error('Error loading commissary data:', error);
      toast.error('Failed to load commissary data');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    const data = await fetchCommissaryInventory(filters);
    setItems(data);
  };

  const loadSuppliers = async () => {
    const data = await fetchSuppliers();
    setSuppliers(data);
  };

  const getStockLevelIcon = (level: 'good' | 'low' | 'out') => {
    switch (level) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'out': return <Package className="h-4 w-4 text-red-600" />;
    }
  };

  const getStockLevelBadge = (level: 'good' | 'low' | 'out') => {
    const variants = {
      good: 'default',
      low: 'secondary',
      out: 'destructive'
    } as const;

    return (
      <Badge variant={variants[level]} className="flex items-center gap-1">
        {getStockLevelIcon(level)}
        {level.toUpperCase()}
      </Badge>
    );
  };

  const handleEditItem = (item: CommissaryInventoryItem) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleStockAdjustment = (item: CommissaryInventoryItem) => {
    setSelectedItem(item);
    setShowStockDialog(true);
  };

  const handleDeleteItem = (item: CommissaryInventoryItem) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleRemoveDuplicates = async () => {
    setRemovingDuplicates(true);
    const success = await removeDuplicateCommissaryItems();
    if (success) {
      await loadData(); // Refresh the data after removing duplicates
    }
    setRemovingDuplicates(false);
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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Warehouse className="h-8 w-8" />
          Commissary Inventory
        </h1>
        <p className="text-muted-foreground">
          Manage raw materials and supplies for conversion to store inventory. Use Production Management for bulk uploads.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, category: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="raw_materials">Raw Materials</SelectItem>
                <SelectItem value="packaging_materials">Packaging Materials</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.stockLevel || 'all'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, stockLevel: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Stock Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="good">Good Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.supplier || 'none'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, supplier: value === 'none' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-croffle-accent hover:bg-croffle-accent/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Raw Material
          </Button>
          
          <Button
            onClick={handleRemoveDuplicates}
            disabled={removingDuplicates}
            variant="outline"
            className="text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {removingDuplicates ? "Removing..." : "Remove Duplicates"}
          </Button>
        </div>
      </div>

      {/* Inventory Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Materials & Supplies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No commissary inventory items found. Upload raw materials through Production Management → Bulk Upload to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const stockLevel = getCommissaryStockLevel(item);
                return (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{item.name}</h3>
                          {getStockLevelBadge(stockLevel)}
                          <Badge variant="outline">{item.category.replace('_', ' ')}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Current Stock:</span> {item.current_stock} {item.unit}
                          </div>
                          <div>
                            <span className="font-medium">Min Threshold:</span> {item.minimum_threshold} {item.unit}
                          </div>
                          <div>
                            <span className="font-medium">Unit Cost:</span> {item.unit_cost ? formatCurrency(item.unit_cost) : 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Supplier:</span> {item.supplier?.name || 'N/A'}
                          </div>
                        </div>
                        
                        {item.sku && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">SKU:</span> {item.sku}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockAdjustment(item)}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Commissary Item Dialog */}
      <AddCommissaryItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadData}
      />

      {/* Edit Commissary Item Dialog */}
      <EditCommissaryItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={selectedItem}
        onSuccess={loadData}
      />

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={showStockDialog}
        onOpenChange={setShowStockDialog}
        item={selectedItem}
        onSuccess={loadData}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={selectedItem}
        onSuccess={loadData}
      />
    </div>
  );
}
