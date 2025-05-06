import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Store } from "@/types";
import { useAuth } from "./AuthContext";
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
  
  useEffect(() => {
    const fetchStores = async () => {
      if (!user) {
        setStores([]);
        setCurrentStore(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        let result = null;
        
        // Admin and owner roles get access to all stores with a simple query
        if (user.role === 'admin' || user.role === 'owner') {
          console.log(`${user.role} user, fetching all stores`);
          result = await supabase
            .from('stores')
            .select('*')
            .order('name');
        } else {
          // Other roles can only see stores they have access to
          // Use a regular join query that's less likely to cause issues
          console.log('Regular user, fetching accessible stores through direct join');
          result = await supabase
            .from('user_store_access')
            .select(`
              stores:store_id(*)
            `)
            .eq('user_id', user.id);
          
          // Transform the result to match our expected format
          if (result.data && !result.error) {
            // Map the nested stores objects from the join
            result.data = result.data.map(item => item.stores);
          }
        }
        
        if (result.error) {
          console.error("Store fetch error:", result.error);
          throw result.error;
        }
        
        // Map stores to our Store type
        const mappedStores: Store[] = result.data.map((store: any) => ({
          id: store.id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          email: store.email,
          taxId: store.tax_id || undefined,
          isActive: store.is_active,
          logo: store.logo || undefined,
        }));
        
        setStores(mappedStores);
        
        // Set current store to the first one or keep the current if it's still in the list
        if (mappedStores.length > 0) {
          if (currentStore && mappedStores.some(store => store.id === currentStore.id)) {
            // Keep the current store
          } else {
            setCurrentStore(mappedStores[0]);
          }
        } else {
          setCurrentStore(null);
        }
      } catch (error: any) {
        console.error("Error fetching stores:", error);
        toast.error(error.message || "Failed to load stores");
        setStores([]);
        setCurrentStore(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStores();
  }, [user]);

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
