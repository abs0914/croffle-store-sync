
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { InventoryStock } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  fetchInventoryStock, 
  createInventoryStockItem,
  updateInventoryStockItem,
  adjustInventoryStock
} from "@/services/inventoryStock";

export const useInventoryStockData = () => {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [currentStockItem, setCurrentStockItem] = useState<InventoryStock | null>(null);
  
  const queryClient = useQueryClient();
  
  // Query to fetch inventory stock
  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['inventory-stock', currentStore?.id],
    queryFn: () => currentStore ? fetchInventoryStock(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id
  });
  
  // Mutation for creating an inventory item
  const createMutation = useMutation({
    mutationFn: createInventoryStockItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      setIsAddModalOpen(false);
    }
  });

  // Mutation for updating an inventory item
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<InventoryStock> }) => 
      updateInventoryStockItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      setIsEditModalOpen(false);
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
      setIsStockModalOpen(false);
    }
  });
  
  const handleAddStockItem = (newStockItem: Partial<InventoryStock>) => {
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
  };

  const handleUpdateStockItem = (stockItem: InventoryStock) => {
    if (!stockItem.id) return;

    updateMutation.mutate({
      id: stockItem.id,
      updates: {
        item: stockItem.item,
        unit: stockItem.unit,
        is_active: stockItem.is_active
      }
    });
  };

  const handleStockAdjustment = (
    id: string,
    quantity: number,
    notes?: string
  ) => {
    stockMutation.mutate({
      id,
      newQuantity: Number(quantity),
      notes
    });
  };

  const openEditModal = (stockItem: InventoryStock) => {
    setCurrentStockItem(stockItem);
    setIsEditModalOpen(true);
  };

  const openStockModal = (stockItem: InventoryStock) => {
    setCurrentStockItem(stockItem);
    setIsStockModalOpen(true);
  };
  
  return {
    currentStore,
    stockItems,
    isLoading,
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isStockModalOpen,
    setIsStockModalOpen,
    currentStockItem,
    createMutation,
    updateMutation,
    stockMutation,
    handleAddStockItem,
    handleUpdateStockItem,
    handleStockAdjustment,
    openEditModal,
    openStockModal
  };
};
