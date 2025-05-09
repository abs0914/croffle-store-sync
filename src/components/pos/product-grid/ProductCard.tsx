
import React from "react";
import { Button } from "@/components/ui/button";
import { Product, Category } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  // Check if product is active, handling both is_active and isActive properties
  const isActive = product.is_active || product.isActive;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className={`h-auto p-2 flex flex-col items-center justify-between text-left border-croffle-primary/20 hover:bg-croffle-background hover:border-croffle-primary ${
              !isShiftActive || !isActive ? 'opacity-70' : ''
            }`}
            onClick={() => onClick(product)}
            disabled={!isShiftActive || !isActive}
          >
            {product.image_url || product.image ? (
              <div className="w-full h-24 bg-gray-100 rounded-md overflow-hidden mb-2">
                <img 
                  src={product.image_url || product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-24 bg-croffle-background rounded-md flex items-center justify-center mb-2">
                <span className="text-croffle-primary">No image</span>
              </div>
            )}
            <div className="w-full">
              <p className="font-medium text-sm truncate">{product.name}</p>
              <p className="text-xs text-muted-foreground">
                {product.category ? product.category.name : getCategoryName(product.category_id)}
              </p>
              {!isActive && (
                <span className="inline-block bg-gray-200 text-gray-700 text-xs px-1 rounded mt-1">Inactive</span>
              )}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {!isShiftActive 
            ? "Start a shift to add items to cart" 
            : !isActive
              ? "This product is inactive" 
              : `Select ${product.name}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
