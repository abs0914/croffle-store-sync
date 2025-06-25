import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, Store } from '@/types';
import { toast } from 'sonner';

interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newThisMonth: number;
  averageOrderValue: number;
  newCustomers: number;
  topStoreCustomers: number;
  averageLifetimeValue: number;
}

export function useAdminCustomersData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch customers and stores in parallel
      const [customersResponse, storesResponse] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('stores')
          .select('*')
          .order('name')
      ]);

      if (customersResponse.error) throw customersResponse.error;
      if (storesResponse.error) throw storesResponse.error;

      // Transform store data to match Store interface
      const transformedStores: Store[] = (storesResponse.data || []).map((store: any) => ({
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
      setCustomers(customersResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
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
        customer.phone.toLowerCase().includes(query)
      );
    }

    // Apply store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(customer => customer.store_id === storeFilter);
    }

    return filtered;
  }, [customers, searchQuery, storeFilter]);

  const customerMetrics: CustomerMetrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const newThisMonth = customers.filter(customer => 
      new Date(customer.created_at) >= startOfMonth
    ).length;

    return {
      totalCustomers: customers.length,
      activeCustomers: customers.length, // Assuming all customers are active
      newThisMonth,
      averageOrderValue: 0, // Would need transaction data to calculate
      newCustomers: newThisMonth,
      topStoreCustomers: 0, // Would need more complex calculation
      averageLifetimeValue: 0 // Would need transaction data to calculate
    };
  }, [customers]);

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
    error,
    fetchData,
    refreshCustomers: fetchData,
    customerMetrics,
  };
}
