
import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from "react";
import { Store } from "@/types";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreState {
  stores: Store[];
  currentStore: Store | null;
  isLoading: boolean;
  setCurrentStore: (store: Store) => void;
  canAccessStore: (storeId: string) => boolean;
  isStoreRestricted: boolean; // True if user has limited store access
}

const initialState: StoreState = {
  stores: [],
  currentStore: null,
  isLoading: true,
  setCurrentStore: () => {},
  canAccessStore: () => false,
  isStoreRestricted: false,
};

const StoreContext = createContext<StoreState>(initialState);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determine if user has restricted store access
  const isStoreRestricted = useMemo(() => {
    if (!user) return true;
    // Admin and owner can access all stores
    if (user.role === 'admin' || user.role === 'owner') return false;
    // Other roles are restricted to assigned stores
    return true;
  }, [user]);

  // Check if user can access a specific store
  const canAccessStore = useMemo(() => {
    return (storeId: string): boolean => {
      if (!user) return false;
      // Admin and owner can access any store
      if (user.role === 'admin' || user.role === 'owner') return true;
      // Other roles must be assigned to the store
      return user.storeIds?.includes(storeId) || false;
    };
  }, [user]);

  // Fetch stores when the user is authenticated or their store assignments change
  useEffect(() => {
    if (user) {
      fetchStores();
    } else {
      setStores([]);
      setCurrentStore(null);
      setIsLoading(false);
    }
  }, [user, user?.storeIds]);

  const fetchStores = async () => {
    try {
      setIsLoading(true);

      if (!user) {
        setStores([]);
        setCurrentStore(null);
        return;
      }

      // Fetch stores based on user permissions
      let query = supabase.from('stores').select('*');

      // Admin and owner users can see all stores
      if (user.role === 'admin' || user.role === 'owner') {
        console.log('🔓 [STORE CONTEXT] Loading ALL stores for admin/owner');
        query = query.order('name');
      } else {
        // Regular users (cashier, manager) only see their assigned stores
        console.log('🔒 [STORE CONTEXT] Restricting to assigned stores for role:', user.role);
        if (user.storeIds && user.storeIds.length > 0) {
          query = query.in('id', user.storeIds).order('name');
        } else {
          // User has no assigned stores
          console.warn('⚠️ User has no assigned stores:', user.email);
          setStores([]);
          setCurrentStore(null);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setStores(data as Store[]);
        
        console.log('✅ [STORE CONTEXT] Loaded stores:', {
          userRole: user.role,
          storeCount: data.length,
          isRestricted: isStoreRestricted,
          storeNames: data.map(s => s.name).join(', ')
        });

        // Set the current store based on user's assigned stores
        if (!currentStore) {
          let defaultStore: Store | null = null;

          if (user.role === 'admin' || user.role === 'owner') {
            // For admin/owner, prefer SM City Store if available, otherwise use first store
            const smCityStore = data.find(store => 
              store.name.toLowerCase().includes('sm city') || 
              store.name.toLowerCase().includes('sm-city')
            ) as Store;
            defaultStore = smCityStore || data[0] as Store;
          } else {
            // For regular users, use their first assigned store
            if (user.storeIds && user.storeIds.length > 0) {
              // Find the first assigned store in the fetched data
              defaultStore = data.find(store => store.id === user.storeIds[0]) as Store || data[0] as Store;
            } else {
              defaultStore = data[0] as Store;
            }
          }

          if (defaultStore) {
            console.log('📍 [STORE CONTEXT] Setting default store:', defaultStore.name);
            setCurrentStore(defaultStore);
          }
        }
      } else {
        setStores([]);
        setCurrentStore(null);
      }
    } catch (error) {
      console.error('❌ [STORE CONTEXT] Error fetching stores:', error);
      toast.error('Failed to fetch stores');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        stores,
        currentStore,
        isLoading,
        setCurrentStore,
        canAccessStore,
        isStoreRestricted,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
