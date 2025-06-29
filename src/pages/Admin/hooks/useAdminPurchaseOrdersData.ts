
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';
import { PurchaseOrder } from '@/types/orderManagement';

interface PurchaseOrderMetrics {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  completedOrders: number;
  totalValue: number;
}

export const useAdminPurchaseOrdersData = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchStores();
  }, [dateRange]);

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          store:stores(name),
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      console.log('Admin fetched orders:', ordersData);
      setOrders(ordersData || []);
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw error;
      }

      setStores(data as Store[] || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        (order.supplier?.name && order.supplier.name.toLowerCase().includes(query)) ||
        (order.notes && order.notes.toLowerCase().includes(query))
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(order => order.store_id === storeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, searchQuery, storeFilter, statusFilter]);

  const orderMetrics: PurchaseOrderMetrics = useMemo(() => {
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const approvedOrders = orders.filter(order => order.status === 'approved').length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const totalValue = orders.reduce((sum, order) => sum + order.total_amount, 0);

    return {
      totalOrders: orders.length,
      pendingOrders,
      approvedOrders,
      completedOrders,
      totalValue
    };
  }, [orders]);

  const bulkApproveOrders = async (orderIds: string[]) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .in('id', orderIds);

      if (error) throw error;
      
      toast.success(`Approved ${orderIds.length} orders`);
      await fetchPurchaseOrders();
    } catch (error: any) {
      console.error('Error approving orders:', error);
      toast.error('Failed to approve orders');
    }
  };

  return {
    orders,
    stores,
    filteredOrders,
    searchQuery,
    setSearchQuery,
    storeFilter,
    setStoreFilter,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    isLoading,
    refreshOrders: fetchPurchaseOrders,
    orderMetrics,
    bulkApproveOrders
  };
};
