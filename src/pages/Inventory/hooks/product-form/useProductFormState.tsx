
import { useState, useEffect } from "react";
import { Product, ProductSize } from "@/types";

export interface StockAdjustment {
  quantity: number;
  notes: string;
  type: "adjustment" | "add" | "remove";
}

export function useProductFormState({ product, isEditing }: { 
  product?: Product | null;
  isEditing: boolean;
}) {
  // Basic form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    cost: 0,
    stockQuantity: 0,
    categoryId: "uncategorized",
    isActive: true,
  });

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Size variations state
  const [hasVariations, setHasVariations] = useState(true);
  const [regularPrice, setRegularPrice] = useState<number>(0);
  const [miniPrice, setMiniPrice] = useState<number>(0);
  const [overloadPrice, setOverloadPrice] = useState<number>(0);
  const [regularStock, setRegularStock] = useState<number>(0);
  const [miniStock, setMiniStock] = useState<number>(0);
  const [overloadStock, setOverloadStock] = useState<number>(0);
  
  // Stock adjustment state
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment>({
    quantity: 0,
    notes: "",
    type: "adjustment"
  });
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);

  // Set form data when product is loaded
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        sku: product.sku,
        barcode: product.barcode || "",
        cost: product.cost || 0,
        stockQuantity: product.stockQuantity,
        categoryId: product.categoryId || "uncategorized",
        isActive: product.isActive,
      });

      if (product.image) {
        setImagePreview(product.image);
      }
      
      // Set variation data if available
      if (product.variations && product.variations.length > 0) {
        setHasVariations(true);
        
        const regularVariation = product.variations.find(v => v.size === 'regular');
        const miniVariation = product.variations.find(v => v.size === 'mini');
        const overloadVariation = product.variations.find(v => v.size === 'croffle-overload');
        
        if (regularVariation) {
          setRegularPrice(regularVariation.price);
          setRegularStock(regularVariation.stockQuantity || 0);
        } else {
          setRegularPrice(product.price || 0);
          setRegularStock(Math.floor((product.stockQuantity || 0) / 3));
        }
        
        if (miniVariation) {
          setMiniPrice(miniVariation.price);
          setMiniStock(miniVariation.stockQuantity || 0);
        } else {
          setMiniPrice((product.price || 0) * 0.7);
          setMiniStock(Math.floor((product.stockQuantity || 0) / 3));
        }
        
        if (overloadVariation) {
          setOverloadPrice(overloadVariation.price);
          setOverloadStock(overloadVariation.stockQuantity || 0);
        } else {
          setOverloadPrice((product.price || 0) * 1.3);
          setOverloadStock(Math.floor((product.stockQuantity || 0) / 3));
        }
      } else {
        setHasVariations(false);
        setRegularPrice(product.price || 0);
        setRegularStock(product.stockQuantity || 0);
        setMiniPrice((product.price || 0) * 0.7);
        setMiniStock(0);
        setOverloadPrice((product.price || 0) * 1.3);
        setOverloadStock(0);
      }
    }
  }, [product]);

  return {
    formData,
    setFormData,
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    isSubmitting,
    setIsSubmitting,
    hasVariations,
    setHasVariations,
    regularPrice,
    setRegularPrice,
    miniPrice,
    setMiniPrice,
    overloadPrice,
    setOverloadPrice,
    regularStock,
    setRegularStock,
    miniStock,
    setMiniStock,
    overloadStock,
    setOverloadStock,
    stockAdjustment,
    setStockAdjustment,
    isAdjustmentDialogOpen,
    setIsAdjustmentDialogOpen
  };
}
