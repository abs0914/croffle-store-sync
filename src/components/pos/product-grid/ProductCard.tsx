
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Info, AlertTriangle, XCircle } from "lucide-react";
import { ProductStatusIndicator } from "@/components/pos/ProductStatusIndicator";
import { ImageWithFallback } from "../ImageWithFallback";
import { usePOSInventory } from "@/contexts/POSInventoryContext";

interface ProductCardProps {
  product: Product;
  isShiftActive: boolean;
  getCategoryName: (categoryId: string | undefined) => string;
  onClick: (product: Product) => void;
}

export default function ProductCard({ 
  product, 
  isShiftActive, 
  getCategoryName,
  onClick
}: ProductCardProps) {
  const isActive = product.is_active || product.isActive;
  const { getProductStatus } = usePOSInventory();
  
  // Get inventory status from context
  const inventoryStatus = getProductStatus(product.id);
  
  // Use inventory status for availability calculations
  const stockQuantity = inventoryStatus?.availableQuantity || 0;
  const stockStatus = inventoryStatus?.status || 'out_of_stock';
  const isIngredientAvailable = stockStatus !== 'out_of_stock' && (product.is_available !== false);
  
  const canSell = isActive && isIngredientAvailable;

  const categoryName = product.category
    ? (typeof product.category === 'string' ? product.category : product.category.name)
    : getCategoryName(product.category_id);

  const handleClick = () => {
    if (isShiftActive && canSell) {
      onClick(product);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isShiftActive && canSell) {
      onClick(product);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        relative overflow-hidden transition-all duration-200 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md group cursor-pointer
        ${isShiftActive && canSell
          ? 'hover:shadow-lg hover:border-blue-300'
          : isShiftActive
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-default'
        }
        ${!canSell ? 'opacity-60' : ''}
        ${!isIngredientAvailable ? 'border-red-200 bg-red-50' : ''}
      `}
    >
      {/* Product Image */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url || product.image ? (
          <ImageWithFallback
            src={product.image_url || product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallbackClassName="w-full h-full"
            onError={() => console.warn(`Image failed for product: ${product.name}`)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="w-6 h-6 mx-auto mb-1 bg-gray-200 rounded-full flex items-center justify-center">
                <Info className="w-3 h-3" />
              </div>
              <span className="text-xs">No Image</span>
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-1 left-1 flex gap-1">
          {!isActive && (
            <Badge variant="secondary" className="text-xs font-medium px-1 py-0">
              Inactive
            </Badge>
          )}
          {!isIngredientAvailable && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="destructive" className="text-xs font-medium px-1 py-0 flex items-center gap-1">
                    <XCircle className="w-2 h-2" />
                    Out of Stock
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {inventoryStatus?.isDirectProduct 
                      ? `Only ${stockQuantity} units in stock`
                      : `Cannot make this item`
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Add Button */}
        {isShiftActive && canSell && (
          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
            <Button
              size="sm"
              className="h-6 w-6 p-0 rounded-full bg-green-500 hover:bg-green-600 shadow-lg border-2 border-white touch-manipulation"
              onClick={handleAddClick}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2">
        <div className="space-y-1">
          <div>
            <h3 className="font-semibold text-gray-900 text-xs leading-tight line-clamp-1">
              {product.name}
            </h3>
          </div>

          {/* Price and Stock */}
          <div className="flex justify-between items-end">
            <div className="flex items-baseline">
              <span className="text-sm font-bold text-gray-900">
                ₱{Math.floor(product.price || 0)}
              </span>
              {(product.price || 0) % 1 !== 0 && (
                <span className="text-xs text-gray-900 ml-0.5">
                  .{((product.price || 0) % 1).toFixed(2).slice(2)}
                </span>
              )}
            </div>

            {/* Stock Indicator */}
            {stockQuantity > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`text-xs px-1 py-0.5 rounded-md ${
                      stockStatus === 'out_of_stock' 
                        ? 'text-red-700 bg-red-100' 
                        : 'text-gray-500 bg-gray-100'
                    }`}>
                      {stockQuantity}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {inventoryStatus?.isDirectProduct 
                        ? `${stockQuantity} units in stock`
                        : `Can make ${stockQuantity} units`
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
