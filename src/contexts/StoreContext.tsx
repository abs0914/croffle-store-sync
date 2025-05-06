
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
        
        let data = null;
        let error = null;
        
        // Admin and owner can see all stores
        if (user.role === 'admin') {
          console.log('Admin user, fetching all stores');
          const result = await supabase
            .from('stores')
            .select('*')
            .order('name');
          
          data = result.data;
          error = result.error;
        } else if (user.role === 'owner') {
          console.log('Owner user, fetching all stores');
          const result = await supabase
            .from('stores')
            .select('*')
            .order('name');
          
          data = result.data;
          error = result.error;
        } else {
          // Other roles can only see stores they have access to
          console.log('Regular user, fetching accessible stores');
          const result = await supabase
            .from('stores')
            .select(`
              *,
              user_store_access!inner(user_id)
            `)
            .eq('user_store_access.user_id', user.id)
            .order('name');
          
          data = result.data;
          error = result.error;
        }
        
        if (error) {
          console.error("Store fetch error:", error);
          throw error;
        }
        
        const mappedStores: Store[] = data.map(store => ({
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
