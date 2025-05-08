
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useNavigate } from "react-router-dom";
import { Product } from "@/types";
import { 
  createProduct, 
  updateProduct, 
  uploadProductImage, 
  createProductVariation 
} from "@/services/productService";
import { toast } from "sonner";

export function useProductSubmit({
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
}: any) {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentStore) {
      toast.error("No store selected");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Upload image if selected
      let imageUrl = formData.image as string | null;
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }
      
      // Set the price based on the regular size price
      const productData = {
        ...formData,
        storeId: currentStore.id,
        image: imageUrl,
        price: regularPrice // Use regular variation price as the base product price
      };
      
      let savedProduct: Product | null = null;
      
      if (isEditing && productId) {
        savedProduct = await updateProduct(productId, productData);
      } else {
        savedProduct = await createProduct(productData as Omit<Product, "id">);
      }
      
      // Create variations if hasVariations is checked
      if (savedProduct && hasVariations) {
        try {
          // Create Regular size variation
          await createProductVariation({
            product_id: savedProduct.id,
            name: `${savedProduct.name} Regular`,
            price: regularPrice,
            stock_quantity: regularStock,
            is_active: true,
            sku: `${savedProduct.sku}-REG`,
            size: 'regular' 
          });
          
          // Create Mini size variation
          await createProductVariation({
            product_id: savedProduct.id,
            name: `${savedProduct.name} Mini`,
            price: miniPrice,
            stock_quantity: miniStock,
            is_active: true,
            sku: `${savedProduct.sku}-MINI`,
            size: 'mini'
          });
          
          // Create Croffle Overload variation
          await createProductVariation({
            product_id: savedProduct.id,
            name: `${savedProduct.name} Croffle Overload`,
            price: overloadPrice,
            stock_quantity: overloadStock,
            is_active: true,
            sku: `${savedProduct.sku}-OVR`,
            size: 'croffle-overload'
          });
          
          toast.success("Size variations added");
        } catch (error) {
          console.error("Error creating variations:", error);
          toast.error("Failed to create size variations");
        }
      }
      
      if (savedProduct) {
        toast.success(`Product ${isEditing ? 'updated' : 'created'} successfully`);
        navigate('/inventory');
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} product`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit };
}
