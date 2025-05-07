
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Product } from "@/types";
import { fetchProductById, updateInventory } from "@/services/inventoryService";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Edit, Package, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

interface ProductDetailsProps {
  productId: string;
  onEditClick: () => void;
  onClose: () => void;
}

export default function ProductDetails({ productId, onEditClick, onClose }: ProductDetailsProps) {
  const { currentStore } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      
      try {
        setIsLoading(true);
        const data = await fetchProductById(productId);
        setProduct(data);
      } catch (error) {
        console.error("Error loading product details:", error);
        toast.error("Failed to load product details");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProduct();
  }, [productId]);

  const handleAdjustStock = async () => {
    if (!product || !currentStore) return;
    
    try {
      setAdjustingStock(true);
      
      await updateInventory({
        productId: product.id,
        storeId: currentStore.id,
        quantity: stockAdjustment,
        reason: 'Manual adjustment',
      });
      
      // Update local state
      setProduct(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          stockQuantity: prev.stockQuantity + stockAdjustment
        };
      });
      
      setStockAdjustment(0);
      toast.success("Stock quantity adjusted successfully");
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to adjust stock");
    } finally {
      setAdjustingStock(false);
    }
  };

  if (isLoading) {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      </DialogContent>
    );
  }

  if (!product) {
    return (
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Product Not Found</DialogTitle>
        </DialogHeader>
        <p className="text-center py-8 text-muted-foreground">This product could not be found.</p>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <div className="flex-1">
            {product.name}
            {!product.isActive && (
              <Badge variant="outline" className="bg-gray-100 text-gray-500 ml-2">
                Inactive
              </Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="ml-auto" 
            onClick={onEditClick}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Product Image */}
        {product.image ? (
          <div className="w-full h-48 rounded-md overflow-hidden bg-gray-100">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-48 rounded-md bg-gray-100 flex items-center justify-center">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">SKU</p>
            <p className="font-medium">{product.sku || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Barcode</p>
            <p className="font-medium">{product.barcode || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="font-medium">${product.price.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cost</p>
            <p className="font-medium">{product.cost ? `$${product.cost.toFixed(2)}` : "-"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium">{product.description || "-"}</p>
          </div>
        </div>
        
        {/* Stock Management */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Stock Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-xl font-bold">{product.stockQuantity}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setStockAdjustment(prev => prev - 1)}
                  disabled={adjustingStock}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(parseInt(e.target.value || "0"))}
                  className="w-20 text-center"
                  disabled={adjustingStock}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setStockAdjustment(prev => prev + 1)}
                  disabled={adjustingStock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button 
              className="w-full mt-4"
              onClick={handleAdjustStock}
              disabled={stockAdjustment === 0 || adjustingStock}
            >
              {adjustingStock ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Adjusting...
                </>
              ) : (
                `Adjust Stock (${stockAdjustment > 0 ? '+' : ''}${stockAdjustment})`
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* Variations */}
        {product.variations && product.variations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Variations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product.variations.map((variation) => (
                  <div 
                    key={variation.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">
                        {variation.name}
                        {!variation.isActive && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-500 ml-2">
                            Inactive
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Price: ${variation.price.toFixed(2)} • Stock: {variation.stockQuantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
