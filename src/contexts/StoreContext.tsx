
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

// Create default context value to prevent "hook used outside provider" errors
const defaultStoreState: StoreState = {
  stores: [],
  selectedStore: null,
  currentStore: null,
  isLoading: false,
  error: null,
  selectStore: () => {},
  setCurrentStore: () => {},
  refreshStores: async () => {},
};

const StoreContext = createContext<StoreState>(defaultStoreState);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Get cached stores
  const getCachedStores = () => {
    try {
      const cached = localStorage.getItem('cached_stores');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Check if cache is less than 10 minutes old
        if (Date.now() - parsedCache.cached_at < 10 * 60 * 1000) {
          return parsedCache.stores;
        }
      }
    } catch (error) {
      authDebugger.log('Failed to get cached stores', { error }, 'warning');
    }
    return null;
  };

  // Cache stores in localStorage
  const cacheStores = (stores: Store[]) => {
    try {
      localStorage.setItem('cached_stores', JSON.stringify({
        stores,
        cached_at: Date.now()
      }));
    } catch (error) {
      authDebugger.log('Failed to cache stores', { error }, 'warning');
    }
  };

  // Fetch stores when the user is authenticated
  useEffect(() => {
    console.log('🏪 Store context effect triggered', {
      isAuthenticated,
      hasUser: !!user,
      authLoading,
      userId: user?.id,
      userRole: user?.role,
      userEmail: user?.email
    });

    if (authLoading) {
      authDebugger.log('Store context: Auth still loading, waiting...');
      return;
    }

    if (isAuthenticated && user) {
      authDebugger.log('Store context: User authenticated, fetching stores', {
        userId: user.id,
        role: user.role,
        storeIds: user.storeIds,
        email: user.email
      });

      // Try to use cached stores first
      const cachedStores = getCachedStores();
      if (cachedStores && cachedStores.length > 0) {
        authDebugger.log('Using cached stores', { storeCount: cachedStores.length });
        setStores(cachedStores);
        if (!selectedStore) {
          const defaultStore = cachedStores[0];
          setSelectedStore(defaultStore);
        }
      }

      // Fetch fresh stores in background
      fetchStores();
    } else {
      authDebugger.log('Store context: User not authenticated, clearing stores', {
        isAuthenticated,
        hasUser: !!user,
        authLoading
      });
      setStores([]);
      setSelectedStore(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.storeIds, user?.id, authLoading]);

  const fetchStores = async () => {
    try {
      // Don't set loading to true if we have cached stores to avoid blocking UI
      const cachedStores = getCachedStores();
      if (!cachedStores || cachedStores.length === 0) {
        setIsLoading(true);
      }
      setError(null);

      authDebugger.log('Fetching stores for user', {
        userId: user?.id,
        role: user?.role,
        storeIds: user?.storeIds,
        hasCachedStores: !!(cachedStores && cachedStores.length > 0)
      });

      if (!isAuthenticated || !user) {
        authDebugger.log('No authenticated user, skipping store fetch');
        setStores([]);
        setSelectedStore(null);
        setIsLoading(false);
        return;
      }

      // Build query based on user permissions with 1 second timeout
      let query = supabase.from('stores').select('*');

      // Admin and owner users can see all stores
      if (user.role === 'admin' || user.role === 'owner') {
        authDebugger.log('Admin/Owner user - fetching all stores', {
          role: user.role,
          email: user.email
        });
        query = query.order('name');
      } else {
        // Regular users (cashier, manager) only see their assigned stores
        if (user.storeIds && user.storeIds.length > 0) {
          authDebugger.log('Regular user - fetching assigned stores', {
            storeIds: user.storeIds,
            role: user.role,
            email: user.email
          });
          query = query.in('id', user.storeIds).order('name');
        } else {
          // User has no assigned stores
          authDebugger.log('User has no assigned stores', {
            email: user.email,
            role: user.role,
            storeIds: user.storeIds
          }, 'warning');
          setStores([]);
          setSelectedStore(null);
          setIsLoading(false);
          // Removed performance tracking for debugging
          return;
        }
      }

      // Execute the query with 15 second timeout (increased from 1 second)
      const queryPromise = query;
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Store fetch timeout')), 15000)
      );

      const { data, error: queryError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;

      if (queryError) {
        authDebugger.log('Error fetching stores', { error: queryError.message }, 'error');

        // If we have cached stores, use them instead of showing error
        const cachedStores = getCachedStores();
        if (cachedStores && cachedStores.length > 0) {
          authDebugger.log('Using cached stores due to fetch error', { storeCount: cachedStores.length });
          setStores(cachedStores);
          if (!selectedStore) {
            setSelectedStore(cachedStores[0]);
          }
          setError(null); // Clear error since we have fallback data
        } else {
          setError(`Failed to fetch stores: ${queryError.message}`);
        }
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
        cacheStores(transformedStores);

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

      // Removed performance tracking for debugging
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      authDebugger.log('Store fetch failed or timed out', { error: errorMessage }, 'error');

      // Don't show error toast for timeout if we have cached stores
      const cachedStores = getCachedStores();
      if (!cachedStores || cachedStores.length === 0) {
        setError(`Failed to fetch stores: ${errorMessage}`);
        toast.error('Failed to fetch stores - using cached data');
      }

      // Removed performance tracking for debugging
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
  
  // Add safety check with better error message
  if (context === undefined) {
    authDebugger.log('useStore called outside of StoreProvider', {}, 'error');
    throw new Error('useStore must be used within a StoreProvider. Make sure your component is wrapped with StoreProvider.');
  }
  
  return context;
}
