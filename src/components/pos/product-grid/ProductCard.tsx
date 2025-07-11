
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnifiedProduct } from "@/services/product/unifiedProductService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Info } from "lucide-react";

interface ProductCardProps {
  product: UnifiedProduct;
  isShiftActive: boolean;
  getCategoryName: (categoryId: string | undefined) => string;
  onClick: (product: UnifiedProduct) => void;
}

export default function ProductCard({
  product,
  isShiftActive,
  getCategoryName,
  onClick
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
    <div 
      onClick={handleClick}
      className={`
        relative overflow-hidden transition-all duration-200 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md group cursor-pointer
        ${isShiftActive && isActive
          ? 'hover:shadow-lg hover:border-blue-300'
          : isShiftActive
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-default'
        }
        ${!isActive ? 'opacity-60' : ''}
      `}
    >
      {/* Product Image */}
      <div className="relative w-full h-36 md:h-40 lg:h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url || product.image ? (
          <img
            src={product.image_url || product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 mx-auto mb-1 md:mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                <Info className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
              </div>
              <span className="text-xs md:text-sm">No Image</span>
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-2 md:top-3 left-2 md:left-3 flex gap-1 md:gap-2">
          {!isActive && (
            <Badge variant="secondary" className="text-xs font-medium px-1.5 py-0.5">
              Inactive
            </Badge>
          )}
          {stockQuantity <= 5 && stockQuantity > 0 && (
            <Badge variant="destructive" className="text-xs font-medium px-1.5 py-0.5">
              Low Stock
            </Badge>
          )}
          {stockQuantity === 0 && (
            <Badge variant="destructive" className="text-xs font-medium px-1.5 py-0.5">
              Out of Stock
            </Badge>
          )}
        </div>

        {/* Add Button */}
        {isShiftActive && isActive && (
          <div className="absolute bottom-2 md:bottom-3 right-2 md:right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
            <Button
              size="sm"
              className="h-8 w-8 md:h-10 md:w-10 p-0 rounded-full bg-green-500 hover:bg-green-600 shadow-lg border-2 border-white touch-manipulation"
              onClick={handleAddClick}
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 md:p-4">
        <div className="space-y-1.5 md:space-y-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm md:text-base leading-tight">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Price and Stock */}
          <div className="flex justify-between items-end pt-1 md:pt-2">
            <div className="flex items-baseline">
              <span className="text-lg md:text-xl font-bold text-gray-900">
                ₱{Math.floor(product.price || 0)}
              </span>
              {(product.price || 0) % 1 !== 0 && (
                <span className="text-sm md:text-base text-gray-900 ml-0.5">
                  .{((product.price || 0) % 1).toFixed(2).slice(2)}
                </span>
              )}
            </div>

            {/* Stock Indicator */}
            {stockQuantity > 0 && (
              <div className="text-xs text-gray-500 bg-gray-100 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                {stockQuantity} left
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
