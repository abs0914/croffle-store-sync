
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
      console.log('Admin fetching purchase orders...');
      
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Check current user role first
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user?.id);

      const { data: userRole } = await supabase
        .from('app_users')
        .select('role, store_ids')
        .eq('user_id', user?.id)
        .single();
      
      console.log('User role data:', userRole);

      // Fetch ALL purchase orders from ALL stores without any store filtering for admins
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          store:stores(id, name, address),
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        console.error('Error fetching purchase orders:', ordersError);
        throw ordersError;
      }

      console.log('Admin fetched orders:', ordersData);
      console.log('Number of orders fetched:', ordersData?.length || 0);
      
      // Log each order for debugging
      ordersData?.forEach(order => {
        console.log(`Order ${order.order_number}: Status=${order.status}, Store=${order.store?.name || 'Unknown'}`);
      });

      // Search specifically for the order mentioned by the user
      if (ordersData) {
        const specificOrder = ordersData.find(order => order.order_number === 'PO-1751204671373-8ver2imfi');
        if (specificOrder) {
          console.log('Found specific order PO-1751204671373-8ver2imfi:', specificOrder);
        } else {
          console.log('Order PO-1751204671373-8ver2imfi not found in results');
          
          // Try to fetch this specific order directly
          const { data: directOrder, error: directError } = await supabase
            .from('purchase_orders')
            .select(`
              *,
              supplier:suppliers(*),
              store:stores(id, name, address),
              items:purchase_order_items(
                *,
                inventory_stock:inventory_stock(*)
              )
            `)
            .eq('order_number', 'PO-1751204671373-8ver2imfi')
            .single();
          
          if (directError) {
            console.error('Error fetching specific order:', directError);
          } else {
            console.log('Direct fetch of specific order:', directOrder);
          }
        }
      }

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

      console.log('Fetched stores for admin:', data);
      setStores(data as Store[] || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
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
        (order.supplier?.name && order.supplier.name.toLowerCase().includes(query)) ||
        (order.notes && order.notes.toLowerCase().includes(query)) ||
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
