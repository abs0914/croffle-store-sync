
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ProductSize } from "@/types";

interface SizeVariationsProps {
  hasVariations: boolean;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formData: any;
  regularPrice: number;
  miniPrice: number;
  overloadPrice: number;
  regularStock: number;
  miniStock: number;
  overloadStock: number;
  handleVariationPriceChange: (e: React.ChangeEvent<HTMLInputElement>, size: ProductSize) => void;
  handleVariationStockChange: (e: React.ChangeEvent<HTMLInputElement>, size: ProductSize) => void;
}

export const SizeVariations = ({
  hasVariations,
  regularPrice,
  miniPrice,
  overloadPrice,
  regularStock,
  miniStock,
  overloadStock,
  handleVariationPriceChange,
  handleVariationStockChange
}: SizeVariationsProps) => {
  if (!hasVariations) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Size Variations</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set prices and stock levels for different size options of this product.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Regular Size */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-lg font-medium mb-2">Regular</div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="regular-price">Price</Label>
                  <Input
                    id="regular-price"
                    type="number"
                    value={regularPrice || 0}
                    onChange={(e) => handleVariationPriceChange(e, 'regular')}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regular-stock">Stock Quantity</Label>
                  <Input
                    id="regular-stock"
                    type="number"
                    value={regularStock || 0}
                    onChange={(e) => handleVariationStockChange(e, 'regular')}
                    min={0}
                    step={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mini Size */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-lg font-medium mb-2">Mini</div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="mini-price">Price</Label>
                  <Input
                    id="mini-price"
                    type="number"
                    value={miniPrice || 0}
                    onChange={(e) => handleVariationPriceChange(e, 'mini')}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mini-stock">Stock Quantity</Label>
                  <Input
                    id="mini-stock"
                    type="number"
                    value={miniStock || 0}
                    onChange={(e) => handleVariationStockChange(e, 'mini')}
                    min={0}
                    step={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Croffle Overload Size */}
          <Card>
            <CardContent className="pt-4">
              <div className="text-lg font-medium mb-2">Croffle Overload</div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="overload-price">Price</Label>
                  <Input
                    id="overload-price"
                    type="number"
                    value={overloadPrice || 0}
                    onChange={(e) => handleVariationPriceChange(e, 'croffle-overload')}
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overload-stock">Stock Quantity</Label>
                  <Input
                    id="overload-stock"
                    type="number"
                    value={overloadStock || 0}
                    onChange={(e) => handleVariationStockChange(e, 'croffle-overload')}
                    min={0}
                    step={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
