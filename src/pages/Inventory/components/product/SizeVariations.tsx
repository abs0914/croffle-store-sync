
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  handleCheckboxChange,
  formData,
  regularPrice,
  miniPrice,
  overloadPrice,
  regularStock,
  miniStock,
  overloadStock,
  handleVariationPriceChange,
  handleVariationStockChange
}: SizeVariationsProps) => {
  return (
    <div className="border-t pt-4">
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="hasVariations"
          name="hasVariations"
          checked={hasVariations}
          onChange={handleCheckboxChange}
          className="rounded border-gray-300 mr-2"
        />
        <Label htmlFor="hasVariations">Add size variations (Regular, Mini and Croffle Overload)</Label>
      </div>
      
      {hasVariations && (
        <div className="space-y-4 mt-4 border p-4 rounded-md">
          <h3 className="font-medium">Size Variations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Regular Size */}
            <div className="space-y-3 p-3 border rounded-md">
              <h4 className="font-medium">Regular Size</h4>
              <div>
                <Label htmlFor="regularSku">SKU: {formData.sku ? `${formData.sku}-REG` : ''}</Label>
              </div>
              <div>
                <Label htmlFor="regularPrice">Price</Label>
                <Input
                  id="regularPrice"
                  type="number"
                  step="0.01"
                  value={regularPrice}
                  onChange={(e) => handleVariationPriceChange(e, 'regular')}
                />
              </div>
              <div>
                <Label htmlFor="regularStock">Stock Quantity</Label>
                <Input
                  id="regularStock"
                  type="number"
                  value={regularStock}
                  onChange={(e) => handleVariationStockChange(e, 'regular')}
                />
              </div>
            </div>
            
            {/* Mini Size */}
            <div className="space-y-3 p-3 border rounded-md">
              <h4 className="font-medium">Mini Size</h4>
              <div>
                <Label htmlFor="miniSku">SKU: {formData.sku ? `${formData.sku}-MINI` : ''}</Label>
              </div>
              <div>
                <Label htmlFor="miniPrice">Price</Label>
                <Input
                  id="miniPrice"
                  type="number"
                  step="0.01"
                  value={miniPrice}
                  onChange={(e) => handleVariationPriceChange(e, 'mini')}
                />
              </div>
              <div>
                <Label htmlFor="miniStock">Stock Quantity</Label>
                <Input
                  id="miniStock"
                  type="number"
                  value={miniStock}
                  onChange={(e) => handleVariationStockChange(e, 'mini')}
                />
              </div>
            </div>
            
            {/* Croffle Overload Size */}
            <div className="space-y-3 p-3 border rounded-md">
              <h4 className="font-medium">Croffle Overload</h4>
              <div>
                <Label htmlFor="overloadSku">SKU: {formData.sku ? `${formData.sku}-OVR` : ''}</Label>
              </div>
              <div>
                <Label htmlFor="overloadPrice">Price</Label>
                <Input
                  id="overloadPrice"
                  type="number"
                  step="0.01"
                  value={overloadPrice}
                  onChange={(e) => handleVariationPriceChange(e, 'croffle-overload')}
                />
              </div>
              <div>
                <Label htmlFor="overloadStock">Stock Quantity</Label>
                <Input
                  id="overloadStock"
                  type="number"
                  value={overloadStock}
                  onChange={(e) => handleVariationStockChange(e, 'overloadStock')}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
