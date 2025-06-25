
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';

interface OrderMetrics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName?: string;
  customerId?: string;
  customerName?: string;
  status: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
  createdAt: string;
  items: any[];
}

export const useAdminOrdersData = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, [dateRange]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: ordersData, error: ordersError } = await supabase
        .from('transactions')
        .select(`
          *,
          customers:customer_id(name),
          stores:store_id(name)
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) {
        throw ordersError;
      }

      const adminOrders: AdminOrder[] = (ordersData || []).map((transaction) => ({
        id: transaction.id,
        orderNumber: transaction.receipt_number,
        storeId: transaction.store_id,
        storeName: transaction.stores?.name,
        customerId: transaction.customer_id,
        customerName: transaction.customers?.name,
        status: transaction.status,
        total: transaction.total,
        itemCount: Array.isArray(transaction.items) ? transaction.items.length : 0,
        paymentMethod: transaction.payment_method,
        createdAt: transaction.created_at,
        items: Array.isArray(transaction.items) ? transaction.items : []
      }));

      setOrders(adminOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
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

      // Transform database data to match Store interface
      const transformedStores: Store[] = (data || []).map((store: any) => ({
        id: store.id,
        name: store.name,
        location: store.address || store.city || 'N/A',
        phone: store.phone,
        email: store.email,
        address: store.address,
        tax_id: store.tax_id,
        logo_url: store.logo_url,
        is_active: store.is_active,
        created_at: store.created_at,
        updated_at: store.updated_at,
        location_type: store.location_type,
        region: store.region,
        logistics_zone: store.logistics_zone,
        ownership_type: store.ownership_type,
        franchise_agreement_date: store.franchise_agreement_date,
        franchise_fee_percentage: store.franchise_fee_percentage,
        franchisee_contact_info: store.franchisee_contact_info,
      }));

      setStores(transformedStores);
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
        order.orderNumber.toLowerCase().includes(query) ||
        (order.customerName && order.customerName.toLowerCase().includes(query)) ||
        (order.storeName && order.storeName.toLowerCase().includes(query))
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(order => order.storeId === storeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    return filtered;
  }, [orders, searchQuery, storeFilter, statusFilter]);

  const orderMetrics: OrderMetrics = useMemo(() => {
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const totalRevenue = orders
      .filter(order => order.status === 'completed')
      .reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    return {
      totalOrders: orders.length,
      completedOrders,
      pendingOrders,
      totalRevenue,
      averageOrderValue
    };
  }, [orders]);

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
    refreshOrders: fetchOrders,
    orderMetrics
  };
};
