import { useState } from 'react';
import { Product, ProductVariation, ProductSize } from '@/types';

export const useProductFormState = (editingProduct?: Product | null) => {
  const [formData, setFormData] = useState<Partial<Product>>(() => ({
    name: editingProduct?.name || '',
    description: editingProduct?.description || '',
    price: editingProduct?.price || 0,
    cost: editingProduct?.cost || 0,
    sku: editingProduct?.sku || '',
    barcode: editingProduct?.barcode || '',
    category_id: editingProduct?.category_id || '',
    stock_quantity: editingProduct?.stock_quantity || 0,
    is_active: editingProduct?.is_active ?? true,
    image_url: editingProduct?.image_url || '',
  }));

  const [variations, setVariations] = useState<ProductVariation[]>(editingProduct?.product_variations || []);

  const handleFieldChange = (field: keyof Product, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        cost: editingProduct.cost,
        sku: editingProduct.sku,
        barcode: editingProduct.barcode,
        category_id: editingProduct.category_id,
        stock_quantity: editingProduct.stock_quantity,
        is_active: editingProduct.is_active,
        image_url: editingProduct.image_url,
      });
      
      if (editingProduct.product_variations) {
        setVariations(editingProduct.product_variations.map(v => ({
          ...v,
          stock_quantity: v.stock_quantity
        })));
      }
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        cost: 0,
        sku: '',
        barcode: '',
        category_id: '',
        stock_quantity: 0,
        is_active: true,
        image_url: '',
      });
      setVariations([]);
    }
  };

  const addVariation = () => {
    const newVariation: ProductVariation = {
      id: `temp-${Date.now()}`,
      product_id: '',
      name: '',
      price: formData.price || 0,
      stock_quantity: 0,
      is_active: true,
      sku: '',
      size: 'regular' as ProductSize,
    };
    setVariations(prev => [...prev, newVariation]);
  };

  const removeVariation = (index: number) => {
    setVariations(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariation = (index: number, field: keyof ProductVariation, value: any) => {
    setVariations(prev => prev.map((variation, i) => 
      i === index ? { ...variation, [field]: value } : variation
    ));
  };

  const getTotalStock = () => {
    return variations.length > 0 
      ? variations.reduce((sum, v) => sum + v.stock_quantity, 0)
      : formData.stock_quantity || 0;
  };

  const getFormattedProduct = (): Partial<Product> => ({
    ...formData,
    stock_quantity: getTotalStock(),
  });

  return {
    formData,
    variations,
    handleFieldChange,
    resetForm,
    addVariation,
    removeVariation,
    updateVariation,
    getFormattedProduct,
  };
};
