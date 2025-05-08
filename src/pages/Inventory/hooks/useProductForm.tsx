
import { useProductFormState } from "./product-form/useProductFormState";
import { useFormHandlers } from "./product-form/useFormHandlers";
import { useStockOperations } from "./product-form/useStockOperations";
import { useProductSubmit } from "./product-form/useProductSubmit";
import { Product } from "@/types";

interface UseProductFormProps {
  product?: Product | null;
  isEditing: boolean;
  productId?: string;
}

export const useProductForm = ({ product, isEditing, productId }: UseProductFormProps) => {
  // Get state management
  const state = useProductFormState({ product, isEditing });
  
  // Form handlers
  const handlers = useFormHandlers({
    formData: state.formData,
    setFormData: state.setFormData,
    setImageFile: state.setImageFile,
    setImagePreview: state.setImagePreview,
    setHasVariations: state.setHasVariations,
    setRegularPrice: state.setRegularPrice,
    setRegularStock: state.setRegularStock,
    setMiniPrice: state.setMiniPrice,
    setMiniStock: state.setMiniStock,
    setOverloadPrice: state.setOverloadPrice,
    setOverloadStock: state.setOverloadStock,
    setStockAdjustment: state.setStockAdjustment,
    setIsAdjustmentDialogOpen: state.setIsAdjustmentDialogOpen
  });
  
  // Stock operations
  const stockOps = useStockOperations({ 
    product, 
    productId,
    setFormData: state.setFormData
  });
  
  // Form submission
  const { handleSubmit } = useProductSubmit({
    isEditing,
    productId,
    formData: state.formData,
    imageFile: state.imageFile,
    hasVariations: state.hasVariations,
    regularPrice: state.regularPrice,
    miniPrice: state.miniPrice,
    overloadPrice: state.overloadPrice,
    regularStock: state.regularStock,
    miniStock: state.miniStock,
    overloadStock: state.overloadStock,
    setIsSubmitting: state.setIsSubmitting
  });
  
  // Handle stock adjustment save
  const handleSaveStockAdjustment = () => {
    return stockOps.handleSaveStockAdjustment(
      state.stockAdjustment,
      state.setIsAdjustmentDialogOpen
    );
  };
  
  return {
    // State
    formData: state.formData,
    imagePreview: state.imagePreview,
    isSubmitting: state.isSubmitting,
    hasVariations: state.hasVariations,
    regularPrice: state.regularPrice,
    miniPrice: state.miniPrice,
    overloadPrice: state.overloadPrice,
    regularStock: state.regularStock, 
    miniStock: state.miniStock,
    overloadStock: state.overloadStock,
    stockAdjustment: state.stockAdjustment,
    isAdjustmentDialogOpen: state.isAdjustmentDialogOpen,
    
    // Handlers
    handleInputChange: handlers.handleInputChange,
    handleCheckboxChange: handlers.handleCheckboxChange,
    handleSelectChange: handlers.handleSelectChange,
    handleImageChange: handlers.handleImageChange,
    handleRemoveImage: handlers.handleRemoveImage,
    handleVariationPriceChange: handlers.handleVariationPriceChange,
    handleVariationStockChange: handlers.handleVariationStockChange,
    handleAdjustStock: handlers.handleAdjustStock,
    handleStockAdjustmentInputChange: handlers.handleStockAdjustmentInputChange,
    
    // Stock operations
    handleSaveStockAdjustment,
    
    // Form submission
    handleSubmit,
    
    // Dialog state
    setIsAdjustmentDialogOpen: state.setIsAdjustmentDialogOpen,
  };
};
