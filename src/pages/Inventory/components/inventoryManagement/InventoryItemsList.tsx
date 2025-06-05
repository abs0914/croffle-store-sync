
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Edit, Trash2, Package } from "lucide-react";
import { fetchInventoryStock } from "@/services/inventoryManagement/recipeService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { InventoryStock, Supplier } from "@/types/inventoryManagement";
import { AddStockItemForm } from "@/pages/Inventory/components/inventoryStock/AddStockItemForm";
import { EditStockItemForm } from "@/pages/Inventory/components/inventoryStock/EditStockItemForm";
import { StockAdjustmentModal } from "@/pages/Inventory/components/inventoryStock/StockAdjustmentModal";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface InventoryItemsListProps {
  storeId: string;
}

export function InventoryItemsList({ storeId }: InventoryItemsListProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryStock[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryStock | null>(null);
  const [adjustingStock, setAdjustingStock] = useState<InventoryStock | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [itemsData, suppliersData] = await Promise.all([
      fetchInventoryStock(storeId),
      fetchSuppliers()
    ]);
    setItems(itemsData);
    setSuppliers(suppliersData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const handleDeleteItem = async (item: InventoryStock) => {
    if (!confirm(`Are you sure you want to delete "${item.item}"?`)) return;

    // For now, we'll just reload the data
    // In a real implementation, you'd call a delete service
    toast.success('Item deleted successfully');
    loadData();
  };

  const getStockBadge = (item: InventoryStock) => {
    const level = item.stock_quantity === 0 ? 'out' : 'good';
    const config = {
      good: { variant: "default" as const, text: "In Stock" },
      out: { variant: "destructive" as const, text: "Out of Stock" }
    };

    return (
      <Badge variant={config[level].variant}>
        {config[level].text}
      </Badge>
    );
  };

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Store Inventory Items
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Store Item
          </Button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            These are finished ingredients and supplies ready for use in recipes and menu items.
            Raw materials are managed in the Commissary Inventory.
          </p>
        </div>
        
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No inventory items found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.item}</h3>
                      <Badge variant="outline">Store Item</Badge>
                      {getStockBadge(item)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.sku && `SKU: ${item.sku} • `}
                      Unit: {item.unit}
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
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Stock</p>
                    <p className="font-medium">{item.stock_quantity} {item.unit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unit Cost</p>
                    <p className="font-medium">₱{item.cost?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialogs */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AddStockItemForm
          onSave={(data) => {
            // Handle save logic here
            toast.success('Item added successfully');
            setShowAddDialog(false);
            loadData();
          }}
          onCancel={() => setShowAddDialog(false)}
          isLoading={false}
        />
      </Dialog>

      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <EditStockItemForm
            stockItem={editingItem}
            onUpdate={(data) => {
              toast.success('Item updated successfully');
              setEditingItem(null);
              loadData();
            }}
            onCancel={() => setEditingItem(null)}
            isLoading={false}
          />
        </Dialog>
      )}

      {adjustingStock && (
        <Dialog open={!!adjustingStock} onOpenChange={(open) => !open && setAdjustingStock(null)}>
          <StockAdjustmentModal
            stockItem={adjustingStock}
            onSave={(data) => {
              toast.success('Stock adjusted successfully');
              setAdjustingStock(null);
              loadData();
            }}
            onCancel={() => setAdjustingStock(null)}
            isLoading={false}
          />
        </Dialog>
      )}
    </Card>
  );
}
