
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';
import { toast } from 'sonner';

interface StoreMetrics {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  companyOwned: number;
  franchises: number;
}

export function useAdminStoresData() {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;

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
    } catch (error) {
      console.error('Error fetching stores:', error);
      setError('Failed to fetch stores');
      toast.error('Failed to fetch stores');
    } finally {
      setIsLoading(false);
    }
  };

  const createStore = async (storeData: Partial<Store>) => {
    try {
      const storeToCreate = {
        name: storeData.name || '',
        address: storeData.address || '',
        phone: storeData.phone,
        email: storeData.email,
        tax_id: storeData.tax_id,
        logo_url: storeData.logo_url,
        is_active: storeData.is_active ?? true,
        location_type: storeData.location_type,
        region: storeData.region,
        logistics_zone: storeData.logistics_zone,
        ownership_type: storeData.ownership_type,
        franchise_agreement_date: storeData.franchise_agreement_date,
        franchise_fee_percentage: storeData.franchise_fee_percentage,
        franchisee_contact_info: storeData.franchisee_contact_info,
      };

      const { data, error } = await supabase
        .from('stores')
        .insert([storeToCreate])
        .select()
        .single();

      if (error) throw error;

      toast.success('Store created successfully');
      await fetchStores();
      return data;
    } catch (error) {
      console.error('Error creating store:', error);
      toast.error('Failed to create store');
      throw error;
    }
  };

  const updateStore = async (id: string, updates: Partial<Store>) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Store updated successfully');
      await fetchStores();
      return data;
    } catch (error) {
      console.error('Error updating store:', error);
      toast.error('Failed to update store');
      throw error;
    }
  };

  const deleteStore = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Store deleted successfully');
      await fetchStores();
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
      throw error;
    }
  };

  const toggleStoreStatus = async (id: string) => {
    try {
      const store = stores.find(s => s.id === id);
      if (!store) return;

      const { error } = await supabase
        .from('stores')
        .update({ is_active: !store.is_active })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Store ${store.is_active ? 'deactivated' : 'activated'} successfully`);
      await fetchStores();
    } catch (error) {
      console.error('Error toggling store status:', error);
      toast.error('Failed to update store status');
    }
  };

  const getStoresByType = (type: 'company_owned' | 'franchisee') => {
    return stores.filter(store => store.ownership_type === type);
  };

  const getStoresByRegion = (region: string) => {
    return stores.filter(store => store.region === region);
  };

  const filteredStores = useMemo(() => {
    let filtered = stores;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(query) ||
        (store.location && store.location.toLowerCase().includes(query)) ||
        (store.region && store.region.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(store => {
        if (statusFilter === 'active') return store.is_active;
        if (statusFilter === 'inactive') return !store.is_active;
        return true;
      });
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(store => store.location_type === locationFilter);
    }

    return filtered;
  }, [stores, searchQuery, statusFilter, locationFilter]);

  const storeMetrics: StoreMetrics = useMemo(() => {
    const activeStores = stores.filter(store => store.is_active).length;
    const inactiveStores = stores.filter(store => !store.is_active).length;
    const companyOwned = stores.filter(store => store.ownership_type === 'company_owned').length;
    const franchises = stores.filter(store => store.ownership_type === 'franchisee').length;

    return {
      totalStores: stores.length,
      activeStores,
      inactiveStores,
      companyOwned,
      franchises,
      averagePerformance: 0, // Would need performance data to calculate
      alertsCount: 0 // Would need alerts data to calculate
    };
  }, [stores]);

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
    refreshStores: fetchStores,
    storeMetrics,
    createStore,
    updateStore,
    deleteStore,
    toggleStoreStatus,
    getStoresByType,
    getStoresByRegion,
  };
}
