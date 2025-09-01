
import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Package, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ImageWithFallback } from "../ImageWithFallback";
import { usePOSInventory } from "@/contexts/POSInventoryContext";

interface OptimizedProductCardProps {
  product: Product;
  isShiftActive: boolean;
  getCategoryName: (categoryId: string | undefined) => string;
  onClick: (product: Product) => void;
}

const OptimizedProductCard = memo(function OptimizedProductCard({ 
  product, 
  isShiftActive, 
  getCategoryName,
  onClick
}: OptimizedProductCardProps) {
  const navigate = useNavigate();
  const { getProductStatus } = usePOSInventory();
  
  // Get inventory status from context
  const inventoryStatus = getProductStatus(product.id);
  
  // Check if product is active, handling both is_active and isActive properties
  const isActive = product.is_active || product.isActive;
  
  // Check stock availability for direct products
  const isOutOfStock = inventoryStatus?.status === 'out_of_stock';
  const isDirectProduct = inventoryStatus?.isDirectProduct || false;
  
  // Auto-disable if out of stock
  const isDisabled = !isShiftActive || !isActive || isOutOfStock;
  
  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onClick(product);
    }
  }, [onClick, product, isDisabled]);

  const handleQuickRestock = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/inventory');
  }, [navigate]);


  const categoryName = React.useMemo(() => {
    if (product.category) {
      // Handle Category | string union type
      return typeof product.category === 'string' ? product.category : product.category.name;
    }
    return getCategoryName(product.category_id);
  }, [product.category, product.category_id, getCategoryName]);

  const tooltipText = React.useMemo(() => {
    if (!isShiftActive) return "Start a shift to add items to cart";
    if (!isActive) return "This product is inactive";
    if (isOutOfStock && isDirectProduct) return `Out of stock - ${inventoryStatus?.availableQuantity || 0} units available`;
    return `Select ${product.name}`;
  }, [isShiftActive, isActive, isOutOfStock, isDirectProduct, product.name, inventoryStatus?.availableQuantity]);

  const getStockBadge = () => {
    if (!isDirectProduct || !isOutOfStock) return null;
    
    return (
      <Badge variant="destructive" className="text-xs px-1 py-0 bg-red-100 text-red-800">
        Out of Stock
      </Badge>
    );
  };

  return (
    <>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={`h-auto p-0 flex flex-col items-center justify-between text-left border overflow-hidden rounded-lg relative ${
              isDisabled 
                ? 'opacity-50 cursor-not-allowed border-gray-200' 
                : 'border-croffle-primary/20 hover:border-croffle-primary/40'
            }`}
            onClick={handleClick}
            disabled={isDisabled}
          >
            <div className="w-full">
              {/* Stock Warning Overlay */}
              {isOutOfStock && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="destructive" className="text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Out of Stock
                  </Badge>
                </div>
              )}

              {/* Product Type Badge */}
              {isDirectProduct && (
                <div className="absolute top-2 right-2 z-10">
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Direct
                  </Badge>
                </div>
              )}
              
              {product.image_url || product.image ? (
                <div className="w-full aspect-square overflow-hidden bg-white relative">
                  <ImageWithFallback
                    src={product.image_url || product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    fallbackClassName="w-full h-full"
                    enableZoom={true}
                    onError={() => console.warn(`Image failed for product: ${product.name}`)}
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-croffle-background flex items-center justify-center">
                  <span className="text-croffle-primary text-xs">No image</span>
                </div>
              )}
              
              <div className="w-full p-2 bg-white">
                <p className="font-medium text-xs truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground mb-1 line-clamp-1">{categoryName}</p>
                
                {/* Stock Status and Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    {!isActive && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">Inactive</Badge>
                    )}
                    {getStockBadge()}
                  </div>
                  
                  {/* Quick Restock Button */}
                  {isOutOfStock && isDirectProduct && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-xs hover:bg-primary hover:text-primary-foreground"
                      onClick={handleQuickRestock}
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </>
  );
});

export default OptimizedProductCard;
