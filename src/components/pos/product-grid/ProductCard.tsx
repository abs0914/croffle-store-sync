
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Info } from "lucide-react";

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
      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url || product.image ? (
          <img
            src={product.image_url || product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
          {stockQuantity <= 5 && stockQuantity > 0 && (
            <Badge variant="destructive" className="text-xs font-medium px-1 py-0">
              Low
            </Badge>
          )}
          {stockQuantity === 0 && (
            <Badge variant="destructive" className="text-xs font-medium px-1 py-0">
              Out
            </Badge>
          )}
        </div>

        {/* Add Button */}
        {isShiftActive && isActive && (
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
              <div className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded-md">
                {stockQuantity}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
