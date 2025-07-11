import React from "react";
import { UnifiedProduct } from "@/services/product/unifiedProductService";
import { AddonItem } from "@/services/pos/addonService";
import ProductCard from "./ProductCard";

interface CategorySectionProps {
  title: string;
  products: UnifiedProduct[];
  isShiftActive: boolean;
  getCategoryName: (categoryId: string | undefined) => string;
  onClick: (product: UnifiedProduct) => void;
  getRecommendedAddons: (productName: string, addonItems: AddonItem[]) => AddonItem[];
  addonItems: AddonItem[];
  addItemToCart: (product: UnifiedProduct, quantity?: number) => void;
  shouldShowAddonSelection: (product: UnifiedProduct) => boolean;
}

export default function CategorySection({
  title,
  products,
  isShiftActive,
  getCategoryName,
  onClick,
  getRecommendedAddons,
  addonItems,
  addItemToCart,
  shouldShowAddonSelection
}: CategorySectionProps) {
  if (products.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="text-sm text-gray-500">
          {products.length} item{products.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            isShiftActive={isShiftActive}
            getCategoryName={getCategoryName}
            onClick={onClick}
            recommendedAddons={getRecommendedAddons(product.name, addonItems)}
            onAddonQuickAdd={(addonItems) => {
              // Add the main product first
              addItemToCart(product);
              // Then add each addon
              addonItems.forEach(addonItem => {
                addItemToCart(addonItem.product, addonItem.quantity);
              });
            }}
            showAddonQuickSelect={shouldShowAddonSelection(product)}
          />
        ))}
      </div>
    </div>
  );
}
