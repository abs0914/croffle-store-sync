
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/SimplifiedAuthProvider';
import { toast } from 'sonner';

interface StoreState {
  stores: Store[];
  selectedStore: Store | null;
  currentStore: Store | null;
  isLoading: boolean;
  error: string | null;
  selectStore: (store: Store) => void;
  setCurrentStore: (store: Store) => void;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Fetch stores when the user is authenticated or their store assignments change
  useEffect(() => {
    if (isAuthenticated) {
      fetchStores();
    } else {
      setStores([]);
      setSelectedStore(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.storeIds]);

  const fetchStores = async () => {
    try {
      setIsLoading(true);

      if (!isAuthenticated) {
        setStores([]);
        setSelectedStore(null);
        return;
      }

      // Fetch stores based on user permissions
      let query = supabase.from('stores').select('*');

      // Admin and owner users can see all stores
      if (user.role === 'admin' || user.role === 'owner') {
        // Fetch all stores for admin/owner users
        query = query.order('name');
      } else {
        // Regular users (cashier, manager) only see their assigned stores
        if (user.storeIds && user.storeIds.length > 0) {
          query = query.in('id', user.storeIds).order('name');
        } else {
          // User has no assigned stores
          console.warn('User has no assigned stores:', user.email);
          setStores([]);
          setSelectedStore(null);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        // Transform the data to match our Store interface
        const transformedStores: Store[] = data.map(store => ({
          id: store.id,
          name: store.name,
          location: store.address || store.city || 'N/A', // Use address or city as location
          phone: store.phone,
          email: store.email,
          address: store.address,
          tax_id: store.tax_id,
          logo_url: store.logo_url,
          is_active: store.is_active,
          created_at: store.created_at,
          updated_at: store.updated_at,
        }));

        setStores(transformedStores);

        // Set the current store based on user's assigned stores
        if (!selectedStore) {
          let defaultStore: Store | null = null;

          if (user.role === 'admin' || user.role === 'owner') {
            // For admin/owner, use the first store alphabetically
            defaultStore = transformedStores[0];
          } else {
            // For regular users, use their first assigned store
            if (user.storeIds && user.storeIds.length > 0) {
              // Find the first assigned store in the fetched data
              defaultStore = transformedStores.find(store => store.id === user.storeIds[0]) || transformedStores[0];
            } else {
              defaultStore = transformedStores[0];
            }
          }

          if (defaultStore) {
            console.log('Setting default store for user:', user.email, 'to:', defaultStore.name);
            setSelectedStore(defaultStore);
          }
        }
      } else {
        setStores([]);
        setSelectedStore(null);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to fetch stores');
    } finally {
      setIsLoading(false);
    }
  };

  const selectStore = (store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
  };

  const setCurrentStore = (store: Store) => {
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
  };

  const refreshStores = async () => {
    await fetchStores();
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStore,
        currentStore: selectedStore, // For backward compatibility
        isLoading,
        error,
        selectStore,
        setCurrentStore,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
