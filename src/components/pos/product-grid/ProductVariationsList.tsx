
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

  // Log the variations to help debug
  console.log("ProductVariationsList: Available variations", variations);

  return (
    <div className="grid gap-4 py-4">
      {variations.length > 0 ? (
        variations.map(variation => (
          <Button 
            key={variation.id}
            onClick={() => {
              console.log("Selected variation:", variation);
              onVariationSelect(variation);
            }}
            className="w-full justify-between"
            variant="outline"
            type="button"
          >
            <span>{variation.name}</span>
            <span className="font-bold">₱{variation.price.toFixed(2)}</span>
          </Button>
        ))
      ) : (
        <p className="text-center text-muted-foreground">No variations available</p>
      )}
      
      {/* Option to add base product without variation */}
      {selectedProduct && (
        <Button
          onClick={() => {
            console.log("Selected regular product (no variation)");
            onRegularSelect();
          }}
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
