
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Edit, Trash2, Package } from "lucide-react";
import { fetchInventoryItems, getStockLevel, deleteInventoryItem } from "@/services/inventoryManagement/inventoryItemService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { InventoryItem, InventoryFilters, Supplier } from "@/types/inventoryManagement";
import { AddInventoryItemDialog } from "./AddInventoryItemDialog";
import { EditInventoryItemDialog } from "./EditInventoryItemDialog";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface InventoryItemsListProps {
  storeId: string;
}

export function InventoryItemsList({ storeId }: InventoryItemsListProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InventoryFilters>({
    category: 'all',
    stockLevel: 'all',
    search: ''
  });
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<InventoryItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [itemsData, suppliersData] = await Promise.all([
      fetchInventoryItems(storeId, filters),
      fetchSuppliers()
    ]);
    setItems(itemsData);
    setSuppliers(suppliersData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [storeId, filters]);

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    
    const success = await deleteInventoryItem(item.id);
    if (success) {
      loadData();
    }
  };

  const getStockBadge = (item: InventoryItem) => {
    const level = getStockLevel(item.current_stock, item.minimum_threshold);
    const config = {
      good: { variant: "default" as const, text: "Good Stock" },
      low: { variant: "destructive" as const, text: "Low Stock" },
      out: { variant: "destructive" as const, text: "Out of Stock" }
    };
    
    return (
      <Badge variant={config[level].variant}>
        {config[level].text}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Items
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="ingredients">Ingredients</SelectItem>
              <SelectItem value="packaging">Packaging</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filters.stockLevel || 'all'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, stockLevel: value as any }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Stock Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="good">Good Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No inventory items found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      <Badge variant="outline" className="capitalize">
                        {item.category}
                      </Badge>
                      {getStockBadge(item)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.sku && `SKU: ${item.sku} • `}
                      {item.supplier?.name || 'No supplier'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdjustingStock(item)}
                    >
                      Adjust Stock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteItem(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Stock</p>
                    <p className="font-medium">{item.current_stock} {item.unit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Minimum Threshold</p>
                    <p className="font-medium">{item.minimum_threshold} {item.unit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unit Cost</p>
                    <p className="font-medium">₱{item.unit_cost?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {/* Dialogs */}
      <AddInventoryItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        storeId={storeId}
        suppliers={suppliers}
        onSuccess={loadData}
      />
      
      {editingItem && (
        <EditInventoryItemDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          item={editingItem}
          suppliers={suppliers}
          onSuccess={loadData}
        />
      )}
      
      {adjustingStock && user && (
        <StockAdjustmentDialog
          open={!!adjustingStock}
          onOpenChange={(open) => !open && setAdjustingStock(null)}
          item={adjustingStock}
          userId={user.id}
          onSuccess={loadData}
        />
      )}
    </Card>
  );
}
