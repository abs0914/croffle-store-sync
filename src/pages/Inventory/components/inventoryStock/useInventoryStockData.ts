
import { useInventoryStockCore } from "./hooks/useInventoryStockCore";
import { useInventoryStockMutations } from "./hooks/useInventoryStockMutations";
import { useInventoryStockModals } from "./hooks/useInventoryStockModals";
import { useInventoryStockImportExport } from "./hooks/useInventoryStockImportExport";

export const useInventoryStockData = () => {
  // Get core data and state
  const {
    currentStore,
    stockItems,
    isLoading,
    hasMultipleStores
  } = useInventoryStockCore();
  
  // Get modal state management
  const {
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
    setCurrentStockItem,
    openEditModal,
    openStockModal,
    openTransferModal,
    openDeleteConfirm
  } = useInventoryStockModals();
  
  // Set up callbacks for mutation success
  const mutationCallbacks = {
    create: () => setIsAddModalOpen(false),
    update: () => setIsEditModalOpen(false),
    stock: () => setIsStockModalOpen(false),
    transfer: () => setIsTransferModalOpen(false),
    delete: () => {
      setIsDeleteConfirmOpen(false);
      setCurrentStockItem(null);
    }
  };
  
  // Get mutations and action handlers
  const {
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
  } = useInventoryStockMutations(mutationCallbacks);
  
  // Get import/export functionality
  const {
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate
  } = useInventoryStockImportExport(stockItems);
  
  return {
    // Core data
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
