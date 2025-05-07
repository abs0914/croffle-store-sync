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
        
        let storesData = [];
        
        // Admin users get access to all stores with a simple query
        if (user.role === 'admin') {
          console.log(`Admin user, fetching all stores`);
          
          // Use a simple try-catch to handle specific error types
          try {
            const { data, error } = await supabase
              .from('stores')
              .select('*')
              .order('name');
              
            if (error) {
              console.error("Supabase stores query error:", error);
              throw error;
            }
            
            storesData = data || [];
          } catch (queryError: any) {
            console.error("Store fetch error details:", queryError);
            // Attempt a simpler query without the order clause
            // as a fallback in case there's an issue with the order directive
            try {
              const { data, error } = await supabase
                .from('stores')
                .select('*');
                
              if (error) throw error;
              storesData = data || [];
            } catch (fallbackError: any) {
              console.error("Even fallback query failed:", fallbackError);
              throw fallbackError;
            }
          }
        }
        // Owner users can see stores they have access to
        else if (user.role === 'owner') {
          console.log(`Owner user, fetching accessible stores`);
          try {
            const { data, error } = await supabase
              .from('user_store_access')
              .select(`
                store_id,
                stores:store_id(*)
              `)
              .eq('user_id', user.id);
            
            if (error) throw error;
            
            // Transform the result to match our expected format
            storesData = data?.map(item => item.stores) || [];
          } catch (ownerError: any) {
            console.error("Owner store access error:", ownerError);
            throw ownerError;
          }
        } 
        // Other roles can only see stores they have access to
        else {
          console.log('Regular user, fetching accessible stores through access table');
          try {
            const { data, error } = await supabase
              .from('user_store_access')
              .select(`
                store_id,
                stores:store_id(*)
              `)
              .eq('user_id', user.id);
            
            if (error) throw error;
            
            // Transform the result to match our expected format
            storesData = data?.map(item => item.stores) || [];
          } catch (accessError: any) {
            console.error("User store access error:", accessError);
            throw accessError;
          }
        }
        
        // Map stores to our Store type
        const mappedStores: Store[] = storesData.map((store: any) => ({
          id: store.id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          email: store.email,
          taxId: store.tax_id || undefined,
          isActive: store.is_active,
          logo: store.logo || undefined,
        }));
        
        console.log(`Fetched ${mappedStores.length} stores for user ${user.name}`);
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
