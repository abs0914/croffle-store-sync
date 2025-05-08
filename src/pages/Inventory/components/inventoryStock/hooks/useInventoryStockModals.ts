
import { useState, useCallback } from "react";
import { InventoryStock } from "@/types";

export const useInventoryStockModals = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [currentStockItem, setCurrentStockItem] = useState<InventoryStock | null>(null);
  
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
  };
};
