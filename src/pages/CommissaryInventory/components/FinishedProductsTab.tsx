
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, PlayCircle, History } from "lucide-react";
import { CommissaryInventoryItem } from "@/types/inventoryManagement";
import { fetchOrderableItems } from "@/services/inventoryManagement/commissaryInventoryService";
import { InventoryItemCard } from "./InventoryItemCard";
import { ConversionExecutionDialog } from "./ConversionExecutionDialog";
import { toast } from "sonner";

export function FinishedProductsTab() {
  const [finishedProducts, setFinishedProducts] = useState<CommissaryInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CommissaryInventoryItem | null>(null);

  useEffect(() => {
    loadFinishedProducts();
  }, []);

  const loadFinishedProducts = async () => {
    setLoading(true);
    try {
      const items = await fetchOrderableItems();
      setFinishedProducts(items);
    } catch (error) {
      console.error('Error loading finished products:', error);
      toast.error('Failed to load finished products');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteConversion = (product: CommissaryInventoryItem) => {
    setSelectedProduct(product);
    setShowConversionDialog(true);
  };

  const handleEditItem = (item: CommissaryInventoryItem) => {
    // Handle edit - this would open an edit dialog
    console.log('Edit item:', item);
  };

  const handleStockAdjustment = (item: CommissaryInventoryItem) => {
    // Handle stock adjustment - this would open a stock adjustment dialog
    console.log('Adjust stock:', item);
  };

  const handleDeleteItem = (item: CommissaryInventoryItem) => {
    // Handle delete - this would open a confirmation dialog
    console.log('Delete item:', item);
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
          onClick={() => setShowConversionDialog(true)}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <PlayCircle className="h-4 w-4 mr-2" />
          Execute Conversion
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Finished Products Inventory
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
                No finished products found. Execute conversion processes to create finished products from raw materials.
              </p>
              <Button 
                onClick={() => setShowConversionDialog(true)}
                className="bg-croffle-accent hover:bg-croffle-accent/90"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Execute First Conversion
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {finishedProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{product.name}</h3>
                        <Badge variant="secondary">Finished Product</Badge>
                        {product.current_stock <= 0 && (
                          <Badge variant="destructive">Out of Stock</Badge>
                        )}
                        {product.current_stock > 0 && product.current_stock <= product.minimum_threshold && (
                          <Badge variant="secondary" className="text-yellow-600">Low Stock</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Current Stock:</span> {product.current_stock} {product.uom}
                        </div>
                        <div>
                          <span className="font-medium">Min Threshold:</span> {product.minimum_threshold} {product.uom}
                        </div>
                        <div>
                          <span className="font-medium">Unit Cost:</span> ₱{product.unit_cost?.toFixed(2) || '0.00'}
                        </div>
                        <div>
                          <span className="font-medium">SKU:</span> {product.sku || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecuteConversion(product)}
                        disabled={product.current_stock > 0}
                        title={product.current_stock > 0 ? "Stock available - conversion not needed" : "Execute conversion to restock"}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Execution Dialog would be implemented here */}
      {showConversionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Execute Conversion Process</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                This feature would show available conversion recipes and allow execution of conversions to create finished products.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowConversionDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setShowConversionDialog(false);
                  toast.info('Conversion execution feature coming soon');
                }}>
                  Execute Conversion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
