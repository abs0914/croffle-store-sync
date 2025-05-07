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
  refetchStores: () => Promise<void>;
}

const initialState: StoreState = {
  stores: [],
  currentStore: null,
  isLoading: true,
  setCurrentStore: () => {},
  refetchStores: async () => {},
};

const StoreContext = createContext<StoreState>(initialState);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchStores = async () => {
    if (!user) {
      setStores([]);
      setCurrentStore(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      console.log(`Fetching stores for ${user.role} user: ${user.name}`);
      
      // Simplify the query to reduce chance of RLS policy issues
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');
        
      if (error) {
        console.error("Supabase stores query error:", error);
        throw error;
      }
      
      // Map stores to our Store type
      const mappedStores: Store[] = (data || []).map((store: any) => ({
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        email: store.email,
        taxId: store.tax_id || undefined,
        isActive: store.is_active,
        logo: store.logo || undefined,
      }));
      
      console.log(`Successfully fetched ${mappedStores.length} stores for user ${user.name}`);
      setStores(mappedStores);
      
      // Set current store to the first one or keep the current if it's still in the list
      if (mappedStores.length > 0) {
        if (currentStore && mappedStores.some(store => store.id === currentStore.id)) {
          // Keep the current store
          console.log("Keeping current selected store:", currentStore.name);
        } else {
          console.log("Setting current store to first available:", mappedStores[0].name);
          setCurrentStore(mappedStores[0]);
        }
      } else {
        console.log("No stores available, setting current store to null");
        setCurrentStore(null);
      }
    } catch (error: any) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores. Please try again later.");
      setStores([]);
      setCurrentStore(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Re-fetch stores when the user changes
  useEffect(() => {
    if (user) {
      fetchStores();
    } else {
      setStores([]);
      setCurrentStore(null);
      setIsLoading(false);
    }
  }, [user]);

  return (
    <StoreContext.Provider
      value={{
        stores,
        currentStore,
        isLoading,
        setCurrentStore,
        refetchStores: fetchStores
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
