
import { Product, ProductSize } from "@/types";

export function useFormHandlers({
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
}: any) {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === "number" ? parseFloat(value) || 0 : value;
    handleFieldChange(name as keyof Product, processedValue);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name === "hasVariations") {
      setHasVariations(checked);
    } else {
      handleFieldChange(name as keyof Product, checked);
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    handleFieldChange(name as keyof Product, value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    handleFieldChange('image_url', '');
  };

  const handleVariationPriceChange = (e: React.ChangeEvent<HTMLInputElement>, size: ProductSize) => {
    const value = parseFloat(e.target.value) || 0;
    if (size === 'regular') {
      setRegularPrice(value);
    } else if (size === 'mini') {
      setMiniPrice(value);
    } else if (size === 'croffle-overload') {
      setOverloadPrice(value);
    }
  };

  const handleVariationStockChange = (e: React.ChangeEvent<HTMLInputElement>, size: ProductSize) => {
    const value = parseInt(e.target.value) || 0;
    if (size === 'regular') {
      setRegularStock(value);
    } else if (size === 'mini') {
      setMiniStock(value);
    } else if (size === 'croffle-overload') {
      setOverloadStock(value);
    }
  };

  const handleAdjustStock = () => {
    setStockAdjustment({
      quantity: 0,
      notes: "",
      type: "adjustment"
    });
    setIsAdjustmentDialogOpen(true);
  };

  const handleStockAdjustmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStockAdjustment((prev: any) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 0 : value,
    }));
  };

  return {
    handleInputChange,
    handleCheckboxChange,
    handleSelectChange,
    handleImageChange,
    handleRemoveImage,
    handleVariationPriceChange,
    handleVariationStockChange,
    handleAdjustStock,
    handleStockAdjustmentInputChange,
  };
}
