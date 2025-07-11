
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnifiedProduct } from "@/services/product/unifiedProductService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AddonQuickSelect } from "../addons/AddonQuickSelect";
import { AddonItem } from "@/services/pos/addonService";
import { Plus, Info } from "lucide-react";

interface ProductCardProps {
  product: UnifiedProduct;
  isShiftActive: boolean;
  getCategoryName: (categoryId: string | undefined) => string;
  onClick: (product: UnifiedProduct) => void;
  recommendedAddons?: AddonItem[];
  onAddonQuickAdd?: (addonItems: any[]) => void;
  showAddonQuickSelect?: boolean;
}

export default function ProductCard({
  product,
  isShiftActive,
  getCategoryName,
  onClick,
  recommendedAddons = [],
  onAddonQuickAdd,
  showAddonQuickSelect = false
}: ProductCardProps) {
  const isActive = product.is_active || product.isActive;
  const stockQuantity = product.stock_quantity || product.stockQuantity || 0;

  const categoryName = product.category
    ? (typeof product.category === 'string' ? product.category : product.category.name)
    : getCategoryName(product.category_id);

  const handleClick = () => {
    if (isShiftActive && isActive) {
      onClick(product);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isShiftActive && isActive) {
      onClick(product);
    }
  };

  return (
    <Card className={`
      relative overflow-hidden transition-all duration-200 hover:shadow-md group
      ${isShiftActive && isActive
        ? 'cursor-pointer hover:shadow-lg border-green-200 hover:border-green-300'
        : isShiftActive
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-default'
      }
      ${!isActive ? 'opacity-60' : ''}
    `}>
      <CardContent className="p-0">
        <div onClick={handleClick} className="relative">
          {/* Product Image */}
          <div className="relative w-full h-32 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
            {product.image_url || product.image ? (
              <img
                src={product.image_url || product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400 text-xs text-center">
                  <div className="w-8 h-8 mx-auto mb-1 bg-gray-200 rounded-full flex items-center justify-center">
                    <Info className="w-4 h-4" />
                  </div>
                  No Image
                </div>
              </div>
            )}

            {/* Status Badges */}
            <div className="absolute top-2 left-2 flex gap-1">
              {!isActive && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
              {stockQuantity <= 5 && stockQuantity > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Low Stock
                </Badge>
              )}
              {stockQuantity === 0 && (
                <Badge variant="destructive" className="text-xs">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Add Button */}
            {isShiftActive && isActive && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 rounded-full bg-green-500 hover:bg-green-600 shadow-lg"
                  onClick={handleAddClick}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-gray-900 truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {categoryName}
                </p>
              </div>
            </div>

            {/* Price */}
            <div className="flex justify-between items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-green-600">
                  ₱{Math.floor(product.price || 0)}
                </span>
                {(product.price || 0) % 1 !== 0 && (
                  <span className="text-sm text-green-600">
                    .{((product.price || 0) % 1).toFixed(2).slice(2)}
                  </span>
                )}
              </div>

              {/* Stock Indicator */}
              {stockQuantity > 0 && (
                <div className="text-xs text-gray-500">
                  {stockQuantity} left
                </div>
              )}
            </div>

            {/* Product Description (if available) */}
            {product.description && (
              <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Addon Quick Select */}
        {showAddonQuickSelect && isShiftActive && isActive && recommendedAddons.length > 0 && onAddonQuickAdd && (
          <div className="px-3 pb-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
            <AddonQuickSelect
              recommendedAddons={recommendedAddons}
              onAddToCart={onAddonQuickAdd}
              productName={product.name}
              disabled={!isShiftActive || !isActive}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
