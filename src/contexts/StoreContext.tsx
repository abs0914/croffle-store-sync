
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Store } from "@/types";
import { useAuth } from "./AuthContext";

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
    if (user) {
      // In a real app, this would fetch stores from Supabase
      const mockStores: Store[] = [
        {
          id: '1',
          name: 'The Croffle Store - Main Branch',
          address: '123 Main Street, Anytown',
          phone: '555-123-4567',
          email: 'main@crofflestore.com',
          tax_id: '123456789',
          is_active: true,
          logo_url: '/lovable-uploads/e4103c2a-e57f-45f0-9999-1567aeda3f3d.png',
        },
        {
          id: '2',
          name: 'The Croffle Store - Downtown',
          address: '456 Market St, Downtown',
          phone: '555-987-6543',
          email: 'downtown@crofflestore.com',
          tax_id: '987654321',
          is_active: true,
        }
      ];
      
      setStores(mockStores);
      setCurrentStore(mockStores[0]);
      setIsLoading(false);
    } else {
      setStores([]);
      setCurrentStore(null);
    }
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
