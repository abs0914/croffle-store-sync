
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "@/services/productService";
import { fetchCategories } from "@/services/categoryService";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductHeader } from "./components/product/ProductHeader";
import { ProductBasicInfo } from "./components/product/ProductBasicInfo";
import { ProductImageUpload } from "./components/product/ProductImageUpload";
import { SizeVariations } from "./components/product/SizeVariations";
import { ProductFormActions } from "./components/product/ProductFormActions";
import { StockAdjustmentDialog } from "./components/product/StockAdjustmentDialog";
import { useProductForm } from "./hooks/useProductForm";

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = id !== "new";
  const { currentStore } = useStore();

  // Fetch product data if editing
  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: isEditing && !!id,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", currentStore?.id],
    queryFn: () => currentStore?.id ? fetchCategories(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
  });

  // Use our product form hook
  const {
    formData,
    imagePreview,
    isSubmitting,
    hasVariations,
    regularPrice,
    miniPrice,
    overloadPrice,
    regularStock,
    miniStock,
    overloadStock,
    stockAdjustment,
    isAdjustmentDialogOpen,
    handleInputChange,
    handleCheckboxChange,
    handleSelectChange,
    handleImageChange,
    handleRemoveImage,
    handleVariationPriceChange,
    handleVariationStockChange,
    handleAdjustStock,
    handleStockAdjustmentInputChange,
    handleSaveStockAdjustment,
    handleSubmit,
    setIsAdjustmentDialogOpen,
  } = useProductForm({ product, isEditing, productId: id });

  const setStockAdjustmentType = (value: string) => {
    handleStockAdjustmentInputChange({
      target: { name: "type", value }
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  if (!currentStore) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Please select a store to manage inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProductHeader isEditing={isEditing} />

      {isLoadingProduct && isEditing ? (
        <div className="flex justify-center items-center py-8">
          <Spinner className="h-8 w-8 text-croffle-accent" />
          <span className="ml-2 text-croffle-primary">Loading product...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Enter the basic details for this product.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProductBasicInfo
                formData={formData}
                hasVariations={hasVariations}
                categories={categories}
                handleInputChange={handleInputChange}
                handleCheckboxChange={handleCheckboxChange}
                handleSelectChange={handleSelectChange}
                handleAdjustStock={handleAdjustStock}
              />
              
              <SizeVariations
                hasVariations={hasVariations}
                handleCheckboxChange={handleCheckboxChange}
                formData={formData}
                regularPrice={regularPrice}
                miniPrice={miniPrice}
                overloadPrice={overloadPrice}
                regularStock={regularStock}
                miniStock={miniStock}
                overloadStock={overloadStock}
                handleVariationPriceChange={handleVariationPriceChange}
                handleVariationStockChange={handleVariationStockChange}
              />
              
              <ProductImageUpload
                imagePreview={imagePreview}
                handleImageChange={handleImageChange}
                handleRemoveImage={handleRemoveImage}
              />
            </CardContent>
            <CardFooter>
              <ProductFormActions 
                isSubmitting={isSubmitting} 
                isEditing={isEditing} 
              />
            </CardFooter>
          </Card>
          
          <StockAdjustmentDialog
            isOpen={isAdjustmentDialogOpen}
            onClose={() => setIsAdjustmentDialogOpen(false)}
            stockAdjustment={stockAdjustment}
            handleStockAdjustmentInputChange={handleStockAdjustmentInputChange}
            handleSaveStockAdjustment={handleSaveStockAdjustment}
            setStockAdjustmentType={setStockAdjustmentType}
          />
        </form>
      )}
    </div>
  );
}
