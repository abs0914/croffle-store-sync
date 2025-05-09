
import React from "react";
import { ProductVariation, Product } from "@/types";
import { Button } from "@/components/ui/button";

interface ProductVariationsListProps {
  isLoading: boolean;
  variations: ProductVariation[];
  onVariationSelect: (variation: ProductVariation) => void;
  onRegularSelect: () => void;
  selectedProduct: Product | null;
}

export default function ProductVariationsList({
  isLoading,
  variations,
  onVariationSelect,
  onRegularSelect,
  selectedProduct
}: ProductVariationsListProps) {
  if (isLoading) {
    return (
      <div className="py-6 flex justify-center">
        <p>Loading variations...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 py-4">
      {variations.map(variation => (
        <Button 
          key={variation.id}
          onClick={() => onVariationSelect(variation)}
          className="w-full justify-between"
          variant="outline"
          type="button"
        >
          <span>{variation.name}</span>
          <span className="font-bold">₱{variation.price.toFixed(2)}</span>
        </Button>
      ))}
      
      {/* Option to add base product without variation */}
      {selectedProduct && (
        <Button
          onClick={onRegularSelect}
          className="w-full justify-between mt-2"
          type="button"
        >
          <span>Regular (No variation)</span>
          <span className="font-bold">₱{selectedProduct.price.toFixed(2)}</span>
        </Button>
      )}
    </div>
  );
}
