
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Package, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OptimizedProductCardProps {
  product: Product;
  isShiftActive: boolean;
  getCategoryName: (categoryId: string | undefined) => string;
  onClick: (product: Product) => void;
  inventoryStatus?: {
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    availableQuantity: number;
    isDirectProduct: boolean;
  };
}

const OptimizedProductCard = memo(function OptimizedProductCard({ 
  product, 
  isShiftActive, 
  getCategoryName,
  onClick,
  inventoryStatus
}: OptimizedProductCardProps) {
  const navigate = useNavigate();
  
  // Check if product is active, handling both is_active and isActive properties
  const isActive = product.is_active || product.isActive;
  
  // Check stock availability for direct products
  const isOutOfStock = inventoryStatus?.status === 'out_of_stock';
  const isLowStock = inventoryStatus?.status === 'low_stock';
  const isDirectProduct = inventoryStatus?.isDirectProduct || false;
  
  // Auto-disable if out of stock
  const isDisabled = !isShiftActive || !isActive || isOutOfStock;
  
  const handleClick = React.useCallback(() => {
    if (!isDisabled) {
      onClick(product);
    }
  }, [onClick, product, isDisabled]);

  const handleQuickRestock = React.useCallback((e: React.MouseEvent) => {
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
    if (isLowStock && isDirectProduct) return `Low stock - Only ${inventoryStatus?.availableQuantity || 0} units available`;
    return `Select ${product.name}`;
  }, [isShiftActive, isActive, isOutOfStock, isLowStock, isDirectProduct, product.name, inventoryStatus?.availableQuantity]);

  const getStockBadge = () => {
    if (!isDirectProduct) return null;
    
    if (isOutOfStock) {
      return (
        <Badge variant="destructive" className="text-xs bg-red-100 text-red-800">
          Out of Stock
        </Badge>
      );
    }
    
    if (isLowStock) {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-500">
          Low Stock ({inventoryStatus?.availableQuantity})
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
        In Stock ({inventoryStatus?.availableQuantity})
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={`h-auto p-0 flex flex-col items-center justify-between text-left border overflow-hidden rounded-lg relative ${
              isDisabled 
                ? 'opacity-50 cursor-not-allowed border-gray-200' 
                : isLowStock 
                  ? 'border-yellow-300 bg-yellow-50/50' 
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
              
              {isLowStock && !isOutOfStock && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
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
                <div className="w-full h-36 overflow-hidden bg-white">
                  <img 
                    src={product.image_url || product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-36 bg-croffle-background flex items-center justify-center">
                  <span className="text-croffle-primary">No image</span>
                </div>
              )}
              
              <div className="w-full p-3 bg-white">
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{categoryName}</p>
                
                {/* Stock Status */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    {!isActive && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                    {getStockBadge()}
                  </div>
                  
                  {/* Quick Restock Button */}
                  {isOutOfStock && isDirectProduct && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs hover:bg-primary hover:text-primary-foreground"
                      onClick={handleQuickRestock}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Restock
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
  );
});

export default OptimizedProductCard;
