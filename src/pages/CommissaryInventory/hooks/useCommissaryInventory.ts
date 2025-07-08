
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
  const { user, hasPermission } = useAuth();
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
  const hasAdminAccess = hasPermission('admin') || hasPermission('owner') || hasPermission('manager');

  // Debug logging for authentication state
  useEffect(() => {
    console.log('useCommissaryInventory: Authentication state changed');
    console.log('- User:', user?.email);
    console.log('- Role:', user?.role);
    console.log('- Has admin access:', hasAdminAccess);
  }, [user, hasAdminAccess]);

  useEffect(() => {
    if (!user) {
      console.log('useCommissaryInventory: No user, stopping load');
      setLoading(false);
      return;
    }

    if (!hasAdminAccess) {
      console.log('useCommissaryInventory: User lacks permissions');
      toast.error('Access denied. Commissary inventory is only available to administrators, owners, and managers.');
      setLoading(false);
      return;
    }

    console.log('useCommissaryInventory: Loading data for authorized user');
    loadData();
  }, [user, hasAdminAccess]);

  useEffect(() => {
    if (hasAdminAccess && user) {
      console.log('useCommissaryInventory: Reloading items due to filter change');
      loadItems();
    }
  }, [filters, hasAdminAccess, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('useCommissaryInventory: Starting to load all data');
      await Promise.all([loadItems(), loadSuppliers()]);
    } catch (error) {
      console.error('useCommissaryInventory: Error loading commissary data:', error);
      toast.error('Failed to load commissary data');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      console.log('useCommissaryInventory: Fetching commissary inventory with filters:', filters);
      const data = await fetchCommissaryInventory(filters);
      console.log('useCommissaryInventory: Received items:', data.length);
      setItems(data);
    } catch (error) {
      console.error('useCommissaryInventory: Error loading items:', error);
      toast.error('Failed to load commissary items');
    }
  };

  const loadSuppliers = async () => {
    try {
      console.log('useCommissaryInventory: Fetching suppliers');
      const data = await fetchSuppliers();
      console.log('useCommissaryInventory: Received suppliers:', data.length);
      setSuppliers(data);
    } catch (error) {
      console.error('useCommissaryInventory: Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    console.log('useCommissaryInventory: Deleting item:', itemId);
    const success = await deleteCommissaryInventoryItem(itemId);
    if (success) {
      console.log('useCommissaryInventory: Item deleted successfully, reloading data');
      await loadData();
    }
    return success;
  };

  const handleStockAdjustment = async (itemId: string, newStock: number, reason: string) => {
    console.log('useCommissaryInventory: Adjusting stock for item:', itemId, 'New stock:', newStock);
    const success = await adjustCommissaryInventoryStock(itemId, newStock, reason, user?.id || '');
    if (success) {
      console.log('useCommissaryInventory: Stock adjusted successfully, reloading data');
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
