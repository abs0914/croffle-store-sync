
import { useState, useEffect } from "react";
import { CommissaryInventoryItem, CommissaryInventoryFilters } from "@/types/inventoryManagement";
import { 
  fetchCommissaryInventory,
  deleteCommissaryInventoryItem,
  adjustCommissaryInventoryStock
} from "@/services/inventoryManagement/commissaryInventoryService";
import { fetchSuppliers } from "@/services/inventoryManagement/supplierService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";

export function useCommissaryInventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<CommissaryInventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CommissaryInventoryFilters>({
    stockLevel: 'all',
    supplier: '',
    search: '',
    item_type: 'all'
  });

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    if (!hasAdminAccess) {
      toast.error('Access denied. Commissary inventory is only available to administrators.');
      return;
    }
    loadData();
  }, [hasAdminAccess]);

  useEffect(() => {
    if (hasAdminAccess) {
      loadItems();
    }
  }, [filters, hasAdminAccess]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadItems(), loadSuppliers()]);
    } catch (error) {
      console.error('Error loading commissary data:', error);
      toast.error('Failed to load commissary data');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    const data = await fetchCommissaryInventory(filters);
    setItems(data);
  };

  const loadSuppliers = async () => {
    const data = await fetchSuppliers();
    setSuppliers(data);
  };

  const handleDeleteItem = async (itemId: string) => {
    const success = await deleteCommissaryInventoryItem(itemId);
    if (success) {
      await loadData();
    }
    return success;
  };

  const handleStockAdjustment = async (itemId: string, newStock: number, reason: string) => {
    const success = await adjustCommissaryInventoryStock(itemId, newStock, reason, user?.id || '');
    if (success) {
      await loadData();
    }
    return success;
  };

  return {
    items,
    suppliers,
    loading,
    filters,
    setFilters,
    hasAdminAccess,
    loadData,
    handleDeleteItem,
    handleStockAdjustment
  };
}
