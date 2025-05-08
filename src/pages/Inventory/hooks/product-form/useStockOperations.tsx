
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { createInventoryTransaction } from "@/services/productService";
import { toast } from "sonner";
import { StockAdjustment } from "./useProductFormState";

export function useStockOperations({ 
  product,
  productId,
  setFormData 
}: {
  product?: any; 
  productId?: string;
  setFormData: (formData: any) => any;
}) {
  const { currentStore } = useStore();
  const { user } = useAuth();

  const handleSaveStockAdjustment = async (
    stockAdjustment: StockAdjustment, 
    setIsAdjustmentDialogOpen: (isOpen: boolean) => void
  ) => {
    if (!currentStore?.id || !user?.id || !product) return;
    
    try {
      const currentQuantity = product.stockQuantity || 0;
      const newQuantity = stockAdjustment.type === "add" 
        ? currentQuantity + stockAdjustment.quantity
        : stockAdjustment.type === "remove"
          ? currentQuantity - stockAdjustment.quantity
          : stockAdjustment.quantity;
      
      await createInventoryTransaction({
        store_id: currentStore.id,
        product_id: productId!,
        transaction_type: "adjustment",
        quantity: stockAdjustment.quantity,
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        notes: stockAdjustment.notes,
        created_by: user.id
      });
      
      setFormData((prev: any) => ({ ...prev, stockQuantity: newQuantity }));
      setIsAdjustmentDialogOpen(false);
      toast.success("Stock adjusted successfully");
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to adjust stock");
    }
  };

  return {
    handleSaveStockAdjustment
  };
}
