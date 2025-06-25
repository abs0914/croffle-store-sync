
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Store, StoreMetrics } from '@/types';
import { toast } from 'sonner';

export function useAdminStoresData() {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;

      // Transform store data to match Store interface
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
    } catch (error) {
      console.error('Error fetching stores:', error);
      setError('Failed to fetch stores');
      toast.error('Failed to fetch stores');
    } finally {
      setIsLoading(false);
    }
  };

  const createStore = async (storeData: Partial<Store>) => {
    const { data, error } = await supabase
      .from('stores')
      .insert([{
        name: storeData.name,
        address: storeData.address,
        phone: storeData.phone,
        email: storeData.email,
        is_active: storeData.is_active ?? true
      }])
      .select()
      .single();

    if (error) throw error;
    await fetchStores();
    return data;
  };

  const updateStore = async (storeId: string, storeData: Partial<Store>) => {
    const { data, error } = await supabase
      .from('stores')
      .update({
        name: storeData.name,
        address: storeData.address,
        phone: storeData.phone,
        email: storeData.email,
        is_active: storeData.is_active
      })
      .eq('id', storeId)
      .select()
      .single();

    if (error) throw error;
    await fetchStores();
    return data;
  };

  const deleteStore = async (storeId: string) => {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);

    if (error) throw error;
    await fetchStores();
  };

  const getStoresByRegion = (region: string): Store[] => {
    return stores.filter(store => store.region === region);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const filteredStores = useMemo(() => {
    let filtered = stores;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(query) ||
        store.location.toLowerCase().includes(query) ||
        (store.email && store.email.toLowerCase().includes(query)) ||
        (store.phone && store.phone.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(store => 
        statusFilter === 'active' ? store.is_active : !store.is_active
      );
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(store => store.location_type === locationFilter);
    }

    return filtered;
  }, [stores, searchQuery, statusFilter, locationFilter]);

  const storeMetrics: StoreMetrics = useMemo(() => {
    const totalStores = stores.length;
    const activeStores = stores.filter(store => store.is_active).length;
    const inactiveStores = totalStores - activeStores;
    const companyOwned = stores.filter(store => store.ownership_type === 'company_owned').length;
    const franchises = stores.filter(store => store.ownership_type === 'franchisee').length;
    const averagePerformance = 85.2; // Placeholder average performance
    const alertsCount = 3; // Placeholder alerts count

    return {
      totalStores,
      activeStores,
      inactiveStores,
      companyOwned,
      franchises,
      averagePerformance,
      alertsCount
    };
  }, [stores]);

  const refreshStores = () => fetchStores();

  return {
    stores,
    filteredStores,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    locationFilter,
    setLocationFilter,
    isLoading,
    error,
    fetchStores,
    refreshStores,
    createStore,
    updateStore,
    deleteStore,
    getStoresByRegion,
    storeMetrics,
  };
}
