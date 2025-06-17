
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types';
import { Store } from '@/types';

interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  topStoreCustomers: number;
  averageLifetimeValue: number;
}

interface CustomerWithStats extends Customer {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  registrationDate: string;
}

export const useAdminCustomersData = () => {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
    fetchStores();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          stores:store_id(name)
        `)
        .order('created_at', { ascending: false });

      if (customersError) {
        throw customersError;
      }

      // Fetch transaction data for each customer
      const customersWithStats = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('total, created_at')
            .eq('customer_id', customer.id);

          const totalOrders = transactions?.length || 0;
          const totalSpent = transactions?.reduce((sum, t) => sum + t.total, 0) || 0;
          const lastOrderDate = transactions?.length > 0 
            ? transactions[transactions.length - 1].created_at 
            : undefined;

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email || undefined,
            phone: customer.phone,
            storeId: customer.store_id || undefined,
            storeName: customer.stores?.name,
            address: undefined,
            loyaltyPoints: 0,
            totalOrders,
            totalSpent,
            lastOrderDate,
            registrationDate: customer.created_at || new Date().toISOString()
          } as CustomerWithStats;
        })
      );

      setCustomers(customersWithStats);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
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

  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.name.toLowerCase().includes(query) ||
        (customer.email && customer.email.toLowerCase().includes(query)) ||
        customer.phone.includes(query)
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(customer => customer.storeId === storeFilter);
    }

    // Apply status filter (based on recent activity)
    if (statusFilter !== 'all') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (statusFilter === 'active') {
        filtered = filtered.filter(customer => 
          customer.lastOrderDate && new Date(customer.lastOrderDate) > thirtyDaysAgo
        );
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(customer => 
          !customer.lastOrderDate || new Date(customer.lastOrderDate) <= thirtyDaysAgo
        );
      }
    }

    return filtered;
  }, [customers, searchQuery, storeFilter, statusFilter]);

  const customerMetrics: CustomerMetrics = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeCustomers = customers.filter(customer => 
      customer.lastOrderDate && new Date(customer.lastOrderDate) > thirtyDaysAgo
    ).length;

    const newCustomers = customers.filter(customer => 
      new Date(customer.registrationDate) > thirtyDaysAgo
    ).length;

    // Find store with most customers
    const storeCustomerCounts = stores.map(store => ({
      store,
      count: customers.filter(customer => customer.storeId === store.id).length
    }));
    const topStoreCustomers = Math.max(...storeCustomerCounts.map(s => s.count), 0);

    const averageLifetimeValue = customers.length > 0 
      ? customers.reduce((sum, customer) => sum + customer.totalSpent, 0) / customers.length 
      : 0;

    return {
      totalCustomers: customers.length,
      activeCustomers,
      newCustomers,
      topStoreCustomers,
      averageLifetimeValue
    };
  }, [customers, stores]);

  return {
    customers,
    stores,
    filteredCustomers,
    searchQuery,
    setSearchQuery,
    storeFilter,
    setStoreFilter,
    statusFilter,
    setStatusFilter,
    isLoading,
    refreshCustomers: fetchCustomers,
    customerMetrics
  };
};
