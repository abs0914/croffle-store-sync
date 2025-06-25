
import { useState } from 'react';
import { Product, ProductVariation } from '@/types';
import { useProductFormState } from './product-form/useProductFormState';
import { useFormHandlers } from './product-form/useFormHandlers';
import { useProductSubmit } from './product-form/useProductSubmit';

interface UseProductFormProps {
  product?: Product | null;
  isEditing: boolean;
  productId?: string;
}

export const useProductForm = ({ product, isEditing, productId }: UseProductFormProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [hasVariations, setHasVariations] = useState(false);
  const [regularPrice, setRegularPrice] = useState(0);
  const [regularStock, setRegularStock] = useState(0);
  const [miniPrice, setMiniPrice] = useState(0);
  const [miniStock, setMiniStock] = useState(0);
  const [overloadPrice, setOverloadPrice] = useState(0);
  const [overloadStock, setOverloadStock] = useState(0);
  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    notes: "",
    type: "adjustment"
  });
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    formData,
    variations,
    handleFieldChange,
    resetForm,
    addVariation,
    removeVariation,
    updateVariation,
    getFormattedProduct,
  } = useProductFormState(product);

  const handlers = useFormHandlers({
    formData,
    handleFieldChange,
    setImageFile,
    setImagePreview,
    setHasVariations,
    setRegularPrice,
    setRegularStock,
    setMiniPrice,
    setMiniStock,
    setOverloadPrice,
    setOverloadStock,
    setStockAdjustment,
    setIsAdjustmentDialogOpen
  });

  const { handleSubmit } = useProductSubmit({
    isEditing,
    productId,
    formData,
    imageFile,
    hasVariations,
    regularPrice,
    miniPrice,
    overloadPrice,
    regularStock,
    miniStock,
    overloadStock,
    setIsSubmitting
  });

  const handleSaveStockAdjustment = async () => {
    // Implementation for saving stock adjustment
    setIsAdjustmentDialogOpen(false);
  };

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
    isSubmitting,
    ...handlers,
    handleSubmit,
    handleSaveStockAdjustment,
  };
};
