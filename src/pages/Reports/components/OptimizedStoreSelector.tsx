
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Store } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface OptimizedStoreSelectorProps {
  selectedStores: Store[];
  setSelectedStores: (stores: Store[]) => void;
}

export const OptimizedStoreSelector = ({ selectedStores, setSelectedStores }: OptimizedStoreSelectorProps) => {
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      
      // Transform the data to match the Store interface
      return (data || []).map(store => ({
        ...store,
        address: store.address || '',
        location: store.address || `${store.city || ''}, ${store.country || ''}`.trim() || 'Unknown Location'
      })) as Store[];
    }
  });

  useEffect(() => {
    if (stores) {
      setAllStores(stores);
    }
  }, [stores]);

  const handleStoreChange = (storeId: string) => {
    const selectedStore = allStores.find(store => store.id === storeId);
    if (selectedStore) {
      setSelectedStores([selectedStore]);
    }
  };

  const selectedStoreIds = selectedStores.map(store => store.id);

  return (
    <Select
      onValueChange={handleStoreChange}
      defaultValue={selectedStoreIds[0] || ''}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select store" />
      </SelectTrigger>
      <SelectContent>
        {allStores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
