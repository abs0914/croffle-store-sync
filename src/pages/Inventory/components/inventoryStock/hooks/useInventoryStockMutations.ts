
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { InventoryStock } from "@/types";
import { 
  createInventoryStockItem,
  updateInventoryStockItem,
  adjustInventoryStock,
  deleteInventoryStockItem,
  transferInventoryStock
} from "@/services/inventoryStock";
import { useStore } from "@/contexts/StoreContext";

export const useInventoryStockMutations = (
  onMutationSuccess?: {
    create?: () => void;
    update?: () => void;
    stock?: () => void;
    transfer?: () => void;
    delete?: () => void;
  }
) => {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  
  // Mutation for creating an inventory item
  const createMutation = useMutation({
    mutationFn: createInventoryStockItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      onMutationSuccess?.create?.();
      toast.success("Inventory item created successfully");
    },
    onError: (error) => {
      console.error("Error creating inventory item:", error);
      toast.error("Failed to create inventory item");
    }
  });

  // Mutation for updating an inventory item
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<InventoryStock> }) => 
      updateInventoryStockItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      onMutationSuccess?.update?.();
      toast.success("Inventory item updated successfully");
    },
    onError: (error) => {
      console.error("Error updating inventory item:", error);
      toast.error("Failed to update inventory item");
    }
  });

  // Mutation for updating stock
  const stockMutation = useMutation({
    mutationFn: ({ id, newQuantity, notes }: { 
      id: string, 
      newQuantity: number,
      notes?: string
    }) => {
      return adjustInventoryStock(id, newQuantity, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      onMutationSuccess?.stock?.();
      toast.success("Stock quantity updated successfully");
    },
    onError: (error) => {
      console.error("Error adjusting stock:", error);
      toast.error("Failed to update stock quantity");
    }
  });

  // Mutation for transferring stock
  const transferMutation = useMutation({
    mutationFn: ({ 
      sourceId, 
      targetStoreId, 
      quantity,
      notes 
    }: { 
      sourceId: string, 
      targetStoreId: string,
      quantity: number,
      notes?: string
    }) => {
      return transferInventoryStock(sourceId, targetStoreId, quantity, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      onMutationSuccess?.transfer?.();
    }
  });

  // Mutation for deleting an inventory item
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryStockItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      onMutationSuccess?.delete?.();
      toast.success("Inventory item deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting inventory item:", error);
      toast.error("Failed to delete inventory item");
    }
  });
  
  // Action handler functions
  const handleAddStockItem = useCallback((newStockItem: Partial<InventoryStock>) => {
    if (!currentStore?.id) {
      toast.error("Please select a store first");
      return;
    }

    if (!newStockItem.item) {
      toast.error("Item name is required");
      return;
    }

    createMutation.mutate({
      ...newStockItem,
      store_id: currentStore.id,
      stock_quantity: Number(newStockItem.stock_quantity || 0),
      is_active: true
    } as Omit<InventoryStock, "id">);
  }, [currentStore, createMutation]);

  const handleUpdateStockItem = useCallback((stockItem: InventoryStock) => {
    if (!stockItem.id) return;

    updateMutation.mutate({
      id: stockItem.id,
      updates: {
        item: stockItem.item,
        unit: stockItem.unit,
        is_active: stockItem.is_active
      }
    });
  }, [updateMutation]);

  const handleStockAdjustment = useCallback((
    id: string,
    quantity: number,
    notes?: string
  ) => {
    stockMutation.mutate({
      id,
      newQuantity: Number(quantity),
      notes
    });
  }, [stockMutation]);

  const handleStockTransfer = useCallback((
    fromStoreId: string,
    toStoreId: string,
    inventoryItemId: string,
    quantity: number,
    notes?: string
  ) => {
    if (quantity <= 0) {
      toast.error("Transfer quantity must be greater than 0");
      return;
    }
    
    transferMutation.mutate({
      sourceId: inventoryItemId,
      targetStoreId: toStoreId,
      quantity,
      notes
    });
  }, [transferMutation]);

  const handleDeleteStockItem = useCallback((stockItem: InventoryStock) => {
    if (!stockItem || !stockItem.id) return;
    deleteMutation.mutate(stockItem.id);
  }, [deleteMutation]);

  return {
    createMutation,
    updateMutation,
    stockMutation,
    transferMutation,
    deleteMutation,
    handleAddStockItem,
    handleUpdateStockItem,
    handleStockAdjustment,
    handleStockTransfer,
    handleDeleteStockItem
  };
};
