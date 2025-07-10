
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, PlayCircle } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { InventoryItemCard } from "./InventoryItemCard";
// RunConversionDialog removed - using simplified direct recipe system
import { toast } from "sonner";

interface FinishedProductsTabProps {
  onEditItem: (item: CommissaryInventoryItem) => void;
  onStockAdjustment: (item: CommissaryInventoryItem) => void;
  onDeleteItem: (item: CommissaryInventoryItem) => void;
  onRefresh: () => void;
}

export function FinishedProductsTab({
  onEditItem,
  onStockAdjustment,
  onDeleteItem,
  onRefresh
}: FinishedProductsTabProps) {
  const [finishedProducts, setFinishedProducts] = useState<CommissaryInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Simplified - no conversion dialog needed

  useEffect(() => {
    loadFinishedProducts();
  }, []);

  const loadFinishedProducts = async () => {
    setLoading(true);
    try {
      const items = await fetchOrderableItems();
      console.log('Loaded finished products:', items);
      setFinishedProducts(items);
    } catch (error) {
      console.error('Error loading finished products:', error);
      toast.error('Failed to load finished products');
    } finally {
      setLoading(false);
    }
  };

  const handleConversionSuccess = () => {
    loadFinishedProducts();
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Finished Products</h2>
          <p className="text-muted-foreground">
            Manage finished products created through conversion processes
          </p>
        </div>
        <Button 
          onClick={onRefresh}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Refresh Items
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Finished Products Inventory ({finishedProducts.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : finishedProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No finished products found. Upload conversion recipes to create finished products from raw materials.
              </p>
              <Button 
                onClick={onRefresh}
                className="bg-croffle-accent hover:bg-croffle-accent/90"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Refresh Items
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {finishedProducts.map((product) => (
                <InventoryItemCard
                  key={product.id}
                  item={product}
                  onEdit={onEditItem}
                  onStockAdjustment={onStockAdjustment}
                  onDelete={onDeleteItem}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion dialog removed - using simplified direct recipe system */}
    </div>
  );
}
