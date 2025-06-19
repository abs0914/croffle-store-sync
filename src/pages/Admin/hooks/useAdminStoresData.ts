
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';

interface StoreMetrics {
  totalStores: number;
  activeStores: number;
  inactiveStores: number;
  averagePerformance: number;
  alertsCount: number;
  insideCebuStores: number;
  outsideCebuStores: number;
}

export const useAdminStoresData = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setStores(data as Store[] || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStores = useMemo(() => {
    let filtered = stores;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(store => 
        store.name.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query) ||
        (store.email && store.email.toLowerCase().includes(query)) ||
        (store.phone && store.phone.includes(query)) ||
        (store.region && store.region.toLowerCase().includes(query)) ||
        (store.logistics_zone && store.logistics_zone.toLowerCase().includes(query))
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
    const activeStores = stores.filter(store => store.is_active).length;
    const inactiveStores = stores.length - activeStores;
    const insideCebuStores = stores.filter(store => store.location_type === 'inside_cebu').length;
    const outsideCebuStores = stores.filter(store => store.location_type === 'outside_cebu').length;
    
    return {
      totalStores: stores.length,
      activeStores,
      inactiveStores,
      insideCebuStores,
      outsideCebuStores,
      averagePerformance: 87, // Mock data - would be calculated from real metrics
      alertsCount: inactiveStores + Math.floor(Math.random() * 3) // Mock alerts
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
    refreshStores: fetchStores,
    storeMetrics
  };
};
