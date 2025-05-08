
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
  adjustInventoryStock,
  deleteInventoryStockItem,
  transferInventoryStock,
  parseInventoryStockCSV,
  generateInventoryStockCSV,
  generateInventoryStockImportTemplate
} from "@/services/inventoryStock";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useInventoryStockData = () => {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentStockItem, setCurrentStockItem] = useState<InventoryStock | null>(null);
  const [hasMultipleStores, setHasMultipleStores] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Check if user has access to multiple stores
  useQuery({
    queryKey: ['user-stores-count'],
    queryFn: async () => {
      if (!user) return { count: 0 };
      
      const { count, error } = await supabase
        .from('user_stores')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setHasMultipleStores(count !== null && count > 1);
      return { count };
    },
    enabled: !!user?.id
  });
  
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
      setIsEditModalOpen(false);
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
      setIsStockModalOpen(false);
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
      setIsTransferModalOpen(false);
    }
  });

  // Mutation for deleting an inventory item
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryStockItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore?.id] });
      setIsDeleteConfirmOpen(false);
      setCurrentStockItem(null);
      toast.success("Inventory item deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting inventory item:", error);
      toast.error("Failed to delete inventory item");
    }
  });
  
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
    sourceId: string,
    targetStoreId: string,
    quantity: number,
    notes?: string
  ) => {
    if (quantity <= 0) {
      toast.error("Transfer quantity must be greater than 0");
      return;
    }
    
    transferMutation.mutate({
      sourceId,
      targetStoreId,
      quantity,
      notes
    });
  }, [transferMutation]);

  // Updated to receive the entire stock item object
  const handleDeleteStockItem = useCallback((stockItem: InventoryStock) => {
    if (!stockItem || !stockItem.id) return;
    deleteMutation.mutate(stockItem.id);
  }, [deleteMutation]);

  // Export inventory stock to CSV
  const handleExportCSV = useCallback(() => {
    try {
      const csvData = generateInventoryStockCSV(stockItems);
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `inventory-stock-${currentStore?.id}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Inventory stock exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export inventory stock");
    }
  }, [stockItems, currentStore]);

  // Import inventory stock from CSV
  const handleImportClick = useCallback(() => {
    if (!currentStore?.id) {
      toast.error("Please select a store first");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e: any) => {
          try {
            const csvData = e.target.result;
            toast.loading("Processing inventory stock import...");
            
            // Parse CSV and process items
            const importedItems = await parseInventoryStockCSV(csvData, currentStore.id);
            
            toast.dismiss();
            toast.success(`Successfully processed ${importedItems.length} inventory items`);
            
            // Refresh the inventory list
            queryClient.invalidateQueries({ queryKey: ['inventory-stock', currentStore.id] });
          } catch (error) {
            console.error("Import error:", error);
            toast.error("Failed to import inventory stock");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [currentStore, queryClient]);

  // Download CSV template
  const handleDownloadTemplate = useCallback(() => {
    try {
      const csvData = generateInventoryStockImportTemplate();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("hidden", "");
      a.setAttribute("href", url);
      a.setAttribute("download", `inventory-stock-import-template.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Template download error:", error);
      toast.error("Failed to download template");
    }
  }, []);

  const openEditModal = useCallback((stockItem: InventoryStock) => {
    setCurrentStockItem(stockItem);
    setIsEditModalOpen(true);
  }, []);

  const openStockModal = useCallback((stockItem: InventoryStock) => {
    setCurrentStockItem(stockItem);
    setIsStockModalOpen(true);
  }, []);

  const openTransferModal = useCallback((stockItem: InventoryStock) => {
    setCurrentStockItem(stockItem);
    setIsTransferModalOpen(true);
  }, []);
  
  const openDeleteConfirm = useCallback((stockItem: InventoryStock) => {
    setCurrentStockItem(stockItem);
    setIsDeleteConfirmOpen(true);
  }, []);
  
  return {
    currentStore,
    stockItems,
    isLoading,
    hasMultipleStores,
    
    // Modal states
    isAddModalOpen,
    setIsAddModalOpen,
    isEditModalOpen,
    setIsEditModalOpen,
    isStockModalOpen,
    setIsStockModalOpen,
    isTransferModalOpen,
    setIsTransferModalOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    
    currentStockItem,
    
    // Mutations
    createMutation,
    updateMutation,
    stockMutation,
    transferMutation,
    deleteMutation,
    
    // Action handlers
    handleAddStockItem,
    handleUpdateStockItem,
    handleStockAdjustment,
    handleStockTransfer,
    handleDeleteStockItem,
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate,
    
    // Modal openers
    openEditModal,
    openStockModal,
    openTransferModal,
    openDeleteConfirm
  };
};
