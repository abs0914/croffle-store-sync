
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProductVariation, AddOnItem, EnhancedProductCatalogItem } from '@/types/productVariations';
import { calculateFinalPrice } from '@/services/productVariations/productVariationsService';
import { formatCurrency } from '@/utils/format';

interface ProductVariationSelectorProps {
  product: EnhancedProductCatalogItem;
  variations: ProductVariation[];
  addOns: AddOnItem[];
  onAddToCart: (product: EnhancedProductCatalogItem, selectedVariations: ProductVariation[], selectedAddOns: AddOnItem[], finalPrice: number) => void;
  onClose: () => void;
}

export const ProductVariationSelector: React.FC<ProductVariationSelectorProps> = ({
  product,
  variations,
  addOns,
  onAddToCart,
  onClose
}) => {
  const [selectedVariations, setSelectedVariations] = useState<ProductVariation[]>(
    variations.filter(v => v.is_default)
  );
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnItem[]>([]);

  const handleVariationSelect = (variation: ProductVariation) => {
    setSelectedVariations(prev => {
      // Remove any existing variation of the same type
      const filtered = prev.filter(v => v.variation_type !== variation.variation_type);
      // Add the new variation
      return [...filtered, variation];
    });
  };

  const handleAddOnToggle = (addOn: AddOnItem) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.id === addOn.id);
      if (exists) {
        return prev.filter(a => a.id !== addOn.id);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const finalPrice = calculateFinalPrice(product.price, selectedVariations, selectedAddOns);

  const sizeVariations = variations.filter(v => v.variation_type === 'size');
  const temperatureVariations = variations.filter(v => v.variation_type === 'temperature');

  const groupedAddOns = addOns.reduce((groups, addon) => {
    const key = addon.category;
    if (!groups[key]) groups[key] = [];
    groups[key].push(addon);
    return groups;
  }, {} as Record<string, AddOnItem[]>);

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{product.product_name}</span>
          <Button variant="outline" size="sm" onClick={onClose}>×</Button>
        </CardTitle>
        {product.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Size Variations */}
        {sizeVariations.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Size</Label>
            <div className="grid grid-cols-3 gap-2">
              {sizeVariations.map((variation) => (
                <Button
                  key={variation.id}
                  variant={selectedVariations.some(v => v.id === variation.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVariationSelect(variation)}
                  className="flex flex-col h-auto p-3"
                >
                  <span className="font-medium">{variation.name}</span>
                  <span className="text-xs">
                    {formatCurrency(product.price + variation.price_modifier)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Temperature Variations */}
        {temperatureVariations.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Temperature</Label>
            <div className="grid grid-cols-2 gap-2">
              {temperatureVariations.map((variation) => (
                <Button
                  key={variation.id}
                  variant={selectedVariations.some(v => v.id === variation.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVariationSelect(variation)}
                  className="flex flex-col h-auto p-3"
                >
                  <span className="font-medium">{variation.name}</span>
                  <span className="text-xs">
                    +{formatCurrency(variation.price_modifier)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons */}
        {Object.keys(groupedAddOns).length > 0 && (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Add-ons</Label>
            {Object.entries(groupedAddOns).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {formatCategoryName(category)}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((addon) => (
                    <Button
                      key={addon.id}
                      variant={selectedAddOns.some(a => a.id === addon.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAddOnToggle(addon)}
                      className="flex justify-between h-auto p-3"
                    >
                      <span className="text-xs">{addon.name}</span>
                      <span className="text-xs font-semibold">
                        +{formatCurrency(addon.price)}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Price Summary */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-semibold">Total Price:</span>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {formatCurrency(finalPrice)}
            </Badge>
          </div>
          
          <Button 
            className="w-full" 
            onClick={() => onAddToCart(product, selectedVariations, selectedAddOns, finalPrice)}
            size="lg"
          >
            Add to Cart - {formatCurrency(finalPrice)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
