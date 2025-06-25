
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';

export const useStoresData = () => {
  const { data: stores = [], isLoading, error, refetch } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match the Store interface
      const transformedStores = (data || []).map(store => ({
        ...store,
        address: store.address || '',
        location: store.address || `${store.city || ''}, ${store.country || ''}`.trim() || 'Unknown Location'
      })) as Store[];
      
      return transformedStores;
    }
  });

  return {
    stores,
    isLoading,
    error,
    refetch
  };
};
