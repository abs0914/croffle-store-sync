
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Store } from "@/types";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreState {
  stores: Store[];
  currentStore: Store | null;
  isLoading: boolean;
  setCurrentStore: (store: Store) => void;
}

const initialState: StoreState = {
  stores: [],
  currentStore: null,
  isLoading: true,
  setCurrentStore: () => {},
};

const StoreContext = createContext<StoreState>(initialState);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
            console.log('Setting default store for user:', user.email, 'to:', defaultStore.name);
            setCurrentStore(defaultStore);
          }
        }
      } else {
        setStores([]);
        setCurrentStore(null);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
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
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
