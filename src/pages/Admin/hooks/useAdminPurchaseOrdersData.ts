
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
  console.log('🟡 useAdminPurchaseOrdersData hook initializing');
  
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🟡 useAdminPurchaseOrdersData useEffect triggered, dateRange:', dateRange);
    fetchPurchaseOrders();
    fetchStores();
  }, [dateRange]);

  const fetchPurchaseOrders = async () => {
    console.log('🟡 fetchPurchaseOrders starting...');
    setIsLoading(true);
    try {
      console.log('Admin fetching purchase orders...');
      
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);
      console.log('🟡 Date range:', daysAgo, 'days, starting from:', startDate.toISOString());

      // Check current user role first
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🟡 Current user:', user?.id, user?.email);

      const { data: userRole } = await supabase
        .from('app_users')
        .select('role, store_ids')
        .eq('user_id', user?.id)
        .single();
      
      console.log('🟡 User role data:', userRole);

      // Fetch ALL purchase orders from ALL stores without any store filtering for admins
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          store:stores(id, name, address),
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      console.log('🟡 Executing query...');
      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('🔴 Error fetching purchase orders:', ordersError);
        throw ordersError;
      }

      console.log('🟡 Admin fetched orders:', ordersData);
      console.log('🟡 Number of orders fetched:', ordersData?.length || 0);
      
      // Log each order for debugging
      ordersData?.forEach(order => {
        console.log(`🟡 Order ${order.order_number}: Status=${order.status}, Store=${order.store?.name || 'Unknown'}`);
      });

      console.log('🟡 Setting orders state with', ordersData?.length || 0, 'orders');
      setOrders(ordersData || []);
    } catch (error: any) {
      console.error('🔴 Error fetching purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      console.log('🟡 fetchPurchaseOrders completed, setting isLoading to false');
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    console.log('🟡 fetchStores starting...');
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('🔴 Error fetching stores:', error);
        throw error;
      }

      console.log('🟡 Fetched stores for admin:', data?.length || 0, 'stores');
      setStores(data as Store[] || []);
    } catch (error: any) {
      console.error('🔴 Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    console.log('Filtering orders. Total orders:', orders.length);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query) ||
        (order.store && order.store.name && order.store.name.toLowerCase().includes(query))
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      console.log('Applying store filter:', storeFilter);
      filtered = filtered.filter(order => order.store_id === storeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      console.log('Applying status filter:', statusFilter);
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    console.log('Filtered orders count:', filtered.length);
    return filtered;
  }, [orders, searchQuery, storeFilter, statusFilter]);

  const orderMetrics: PurchaseOrderMetrics = useMemo(() => {
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const approvedOrders = orders.filter(order => order.status === 'approved').length;
    const completedOrders = orders.filter(order => order.status === 'delivered' || order.status === 'completed').length;
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
