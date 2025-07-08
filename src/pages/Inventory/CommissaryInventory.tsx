import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Package, AlertTriangle, CheckCircle, Warehouse } from "lucide-react";
import { CommissaryInventoryItem, CommissaryInventoryFilters } from "@/types/inventoryManagement";
import { 
  fetchCommissaryInventory, 
  getCommissaryStockLevel, 
  getCommissaryStockLevelColor 
} from "@/services/inventoryManagement/commissaryInventoryService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { useAuth } from "@/contexts/auth";
import { AddCommissaryItemDialog } from "./components/AddCommissaryItemDialog";
import { EditCommissaryItemDialog } from "./components/EditCommissaryItemDialog";
import { StockAdjustmentDialog } from "./components/StockAdjustmentDialog";
import { DeleteConfirmationDialog } from "./components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";

export default function CommissaryInventory() {
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<CommissaryInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CommissaryInventoryItem | null>(null);
  const [filters, setFilters] = useState<CommissaryInventoryFilters>({
    stockLevel: 'all',
    supplier: '',
    search: '',
    item_type: 'all'
  });

  // Check if user has admin access
  const hasAdminAccess = hasPermission('admin') || hasPermission('owner') || hasPermission('manager');

  // Debug logging
  useEffect(() => {
    console.log('CommissaryInventory: Current user:', user);
    console.log('CommissaryInventory: User role:', user?.role);
    console.log('CommissaryInventory: Has admin access:', hasAdminAccess);
  }, [user, hasAdminAccess]);

  useEffect(() => {
    if (!user) {
      console.log('CommissaryInventory: No user found, stopping load');
      setLoading(false);
      return;
    }

    if (!hasAdminAccess) {
      console.log('CommissaryInventory: User does not have admin access');
      toast.error('Access denied. Commissary inventory is only available to administrators, owners, and managers.');
      setLoading(false);
      return;
    }

    console.log('CommissaryInventory: Loading data for user with access');
    loadData();
  }, [user, hasAdminAccess]);

  useEffect(() => {
    if (hasAdminAccess && user) {
      console.log('CommissaryInventory: Reloading items due to filter change');
      loadItems();
    }
  }, [filters, hasAdminAccess, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('CommissaryInventory: Starting to load all data');
      await Promise.all([loadItems(), loadSuppliers()]);
    } catch (error) {
      console.error('CommissaryInventory: Error loading commissary data:', error);
      toast.error('Failed to load commissary data');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    console.log('CommissaryInventory: Loading items with filters:', filters);
    const data = await fetchCommissaryInventory(filters);
    console.log('CommissaryInventory: Loaded items:', data.length);
    setItems(data);
  };

  const loadSuppliers = async () => {
    console.log('CommissaryInventory: Loading suppliers');
    const data = await fetchSuppliers();
    console.log('CommissaryInventory: Loaded suppliers:', data.length);
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

  // Show authentication required message
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-orange-600" />
            <h2 className="text-2xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access the commissary inventory management.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access restricted message
  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              Commissary inventory management is only available to administrators, owners, and managers.
            </p>
            <p className="text-sm text-muted-foreground">
              Current role: {user?.role || 'Unknown'} | Email: {user?.email}
            </p>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'} className="mt-4">
              Go to Dashboard
            </Button>
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
          Manage raw materials and supplies for conversion to store inventory
        </p>
        
        {/* Debug Information (temporary, only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm">
              <strong>Debug:</strong> User: {user?.email} | Role: {user?.role} | 
              Access: {hasAdminAccess ? 'Granted' : 'Denied'} | Items: {items.length}
            </p>
          </div>
        )}
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
              value={filters.item_type || 'all'}
              onValueChange={(value) => setFilters(prev => ({ ...prev, item_type: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Item Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="raw_material">Raw Materials</SelectItem>
                <SelectItem value="orderable_item">Finished Products</SelectItem>
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
        </div>
      </div>

      {/* Inventory Items */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Materials & Supplies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading commissary inventory...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No commissary inventory items found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search ? 'Try adjusting your search filters' : 'No commissary items have been added yet'}
              </p>
              {!filters.search && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Item
                </Button>
              )}
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
                            <span className="font-medium">Current Stock:</span> {item.current_stock} {item.uom}
                          </div>
                          <div>
                            <span className="font-medium">Min Threshold:</span> {item.minimum_threshold} {item.uom}
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

      {/* Dialogs */}
      <AddCommissaryItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadData}
      />

      <EditCommissaryItemDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        item={selectedItem}
        onSuccess={loadData}
      />

      <StockAdjustmentDialog
        open={showStockDialog}
        onOpenChange={setShowStockDialog}
        item={selectedItem}
        onSuccess={loadData}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        item={selectedItem}
        onSuccess={loadData}
      />
    </div>
  );
}
