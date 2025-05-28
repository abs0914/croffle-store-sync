
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  // Check if product is active, handling both is_active and isActive properties
  const isActive = product.is_active || product.isActive;
  
  const handleClick = React.useCallback(() => {
    onClick(product);
  }, [onClick, product]);

  const categoryName = React.useMemo(() => {
    return product.category ? product.category.name : getCategoryName(product.category_id);
  }, [product.category, product.category_id, getCategoryName]);

  const tooltipText = React.useMemo(() => {
    if (!isShiftActive) return "Start a shift to add items to cart";
    if (!isActive) return "This product is inactive";
    return `Select ${product.name}`;
  }, [isShiftActive, isActive, product.name]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={`h-auto p-0 flex flex-col items-center justify-between text-left border border-croffle-primary/20 overflow-hidden rounded-lg ${
              !isShiftActive || !isActive ? 'opacity-70' : ''
            }`}
            onClick={handleClick}
            disabled={!isShiftActive || !isActive}
          >
            <div className="w-full">
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
                <p className="text-xs text-muted-foreground">{categoryName}</p>
                {!isActive && (
                  <span className="inline-block bg-gray-200 text-gray-700 text-xs px-1 rounded mt-1">Inactive</span>
                )}
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
