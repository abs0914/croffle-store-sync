
import { useState } from 'react';
import { Product, ProductVariation } from '@/types';
import { useProductFormState } from './product-form/useProductFormState';

export const useProductForm = (editingProduct?: Product | null) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [hasVariations, setHasVariations] = useState(false);
  const [regularPrice, setRegularPrice] = useState(0);
  const [regularStock, setRegularStock] = useState(0);
  const [miniPrice, setMiniPrice] = useState(0);
  const [miniStock, setMiniStock] = useState(0);
  const [overloadPrice, setOverloadPrice] = useState(0);
  const [overloadStock, setOverloadStock] = useState(0);
  const [stockAdjustment, setStockAdjustment] = useState(0);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);

  const {
    formData,
    variations,
    handleFieldChange,
    resetForm,
    addVariation,
    removeVariation,
    updateVariation,
    getFormattedProduct,
  } = useProductFormState(editingProduct);

  return {
    formData,
    variations,
    handleFieldChange,
    resetForm,
    addVariation,
    removeVariation,
    updateVariation,
    getFormattedProduct,
    imageFile,
    setImageFile,
    imagePreview,
    setImagePreview,
    hasVariations,
    setHasVariations,
    regularPrice,
    setRegularPrice,
    regularStock,
    setRegularStock,
    miniPrice,
    setMiniPrice,
    miniStock,
    setMiniStock,
    overloadPrice,
    setOverloadPrice,
    overloadStock,
    setOverloadStock,
    stockAdjustment,
    setStockAdjustment,
    isAdjustmentDialogOpen,
    setIsAdjustmentDialogOpen,
  };
};
