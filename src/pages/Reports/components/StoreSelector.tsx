import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Store } from '@/types';
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface StoreSelectorProps {
  selectedStores: Store[];
  setSelectedStores: (stores: Store[]) => void;
}

export const StoreSelector = ({ selectedStores, setSelectedStores }: StoreSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableStores, setAvailableStores] = useState<Store[]>([]);

  const { data: stores = [], isLoading } = useQuery({
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
        location: store.address || `${store.city || ''}, ${store.country || ''}`.trim() || 'Unknown Location'
      })) as Store[];
    }
  });

  useEffect(() => {
    setAvailableStores(stores);
  }, [stores]);

  const handleStoreSelection = (store: Store) => {
    const isSelected = selectedStores.some((s) => s.id === store.id);

    if (isSelected) {
      setSelectedStores(selectedStores.filter((s) => s.id !== store.id));
    } else {
      setSelectedStores([...selectedStores, store]);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredStores = availableStores.filter((store) =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Search stores..."
        className="w-full p-2 border rounded mb-4"
        onChange={handleSearch}
      />
      {isLoading ? (
        <p>Loading stores...</p>
      ) : (
        <ul>
          {filteredStores.map((store) => (
            <li key={store.id} className="flex items-center mb-2">
              <Checkbox
                id={`store-${store.id}`}
                checked={selectedStores.some((s) => s.id === store.id)}
                onCheckedChange={() => handleStoreSelection(store)}
              />
              <Label htmlFor={`store-${store.id}`} className="ml-2">
                {store.name}
              </Label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
