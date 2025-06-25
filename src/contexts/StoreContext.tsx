
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/SimplifiedAuthProvider';
import { toast } from 'sonner';
import { authDebugger } from '@/utils/authDebug';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Fetch stores when the user is authenticated
  useEffect(() => {
    if (authLoading) {
      // Don't fetch stores while auth is still loading
      return;
    }

    if (isAuthenticated && user) {
      authDebugger.log('Store context: User authenticated, fetching stores', { 
        userId: user.id, 
        role: user.role,
        storeIds: user.storeIds 
      });
      fetchStores();
    } else {
      authDebugger.log('Store context: User not authenticated, clearing stores');
      setStores([]);
      setSelectedStore(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.storeIds, user?.id, authLoading]);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      setError(null);
      authDebugger.log('Fetching stores for user', { 
        userId: user?.id, 
        role: user?.role, 
        storeIds: user?.storeIds 
      });

      if (!isAuthenticated || !user) {
        authDebugger.log('No authenticated user, skipping store fetch');
        setStores([]);
        setSelectedStore(null);
        setIsLoading(false);
        return;
      }

      // Build query based on user permissions
      let query = supabase.from('stores').select('*');

      // Admin and owner users can see all stores
      if (user.role === 'admin' || user.role === 'owner') {
        authDebugger.log('Admin/Owner user - fetching all stores');
        query = query.order('name');
      } else {
        // Regular users (cashier, manager) only see their assigned stores
        if (user.storeIds && user.storeIds.length > 0) {
          authDebugger.log('Regular user - fetching assigned stores', { storeIds: user.storeIds });
          query = query.in('id', user.storeIds).order('name');
        } else {
          // User has no assigned stores
          authDebugger.log('User has no assigned stores', { email: user.email }, 'warning');
          setStores([]);
          setSelectedStore(null);
          setIsLoading(false);
          return;
        }
      }

      // Execute the query
      const { data, error: queryError } = await query;

      if (queryError) {
        authDebugger.log('Error fetching stores', { error: queryError.message }, 'error');
        setError(`Failed to fetch stores: ${queryError.message}`);
        toast.error('Failed to fetch stores');
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Transform the data to match our Store interface
        const transformedStores: Store[] = data.map(store => ({
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
        }));

        authDebugger.log('Stores fetched successfully', { storeCount: transformedStores.length });
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
              defaultStore = transformedStores.find(store => store.id === user.storeIds[0]) || transformedStores[0];
            } else {
              defaultStore = transformedStores[0];
            }
          }

          if (defaultStore) {
            authDebugger.log('Setting default store', { 
              storeId: defaultStore.id, 
              storeName: defaultStore.name 
            });
            setSelectedStore(defaultStore);
          }
        }
      } else {
        authDebugger.log('No stores found for user', {}, 'warning');
        setStores([]);
        setSelectedStore(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      authDebugger.log('Store fetch failed', { error: errorMessage }, 'error');
      setError(`Failed to fetch stores: ${errorMessage}`);
      toast.error('Failed to fetch stores');
    } finally {
      setIsLoading(false);
    }
  };

  const selectStore = (store: Store) => {
    authDebugger.log('Store selected', { storeId: store.id, storeName: store.name });
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
  };

  const setCurrentStore = (store: Store) => {
    authDebugger.log('Current store set', { storeId: store.id, storeName: store.name });
    setSelectedStore(store);
    localStorage.setItem('selectedStoreId', store.id);
  };

  const refreshStores = async () => {
    authDebugger.log('Refreshing stores');
    await fetchStores();
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        selectedStore,
        currentStore: selectedStore,
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
