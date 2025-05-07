
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Product, Category } from "@/types";
import { useAuth } from "./AuthContext";
import { useStore } from "./StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts, fetchCategories } from "@/services/inventory";
import { toast } from "sonner";

interface InventoryState {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  refetchInventory: (storeId?: string) => Promise<void>;
}

const initialState: InventoryState = {
  products: [],
  categories: [],
  isLoading: true,
  error: null,
  refetchInventory: async () => {},
};

const InventoryContext = createContext<InventoryState>(initialState);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadInventoryData = async (storeId?: string) => {
    if (!user) {
      setProducts([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    if (!storeId && !currentStore) {
      setProducts([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    const targetStoreId = storeId || currentStore?.id;

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch products and categories in parallel
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(targetStoreId),
        fetchCategories(targetStoreId)
      ]);
      
      console.log(`Successfully fetched ${productsData.length} products and ${categoriesData.length} categories`);
      
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error("Error fetching inventory data:", err);
      setError(err.message || "Failed to load inventory data");
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data when user or store changes
  useEffect(() => {
    if (user && currentStore) {
      loadInventoryData(currentStore.id);
    } else {
      setProducts([]);
      setCategories([]);
      setIsLoading(false);
    }
  }, [user, currentStore]);

  return (
    <InventoryContext.Provider
      value={{
        products,
        categories,
        isLoading,
        error,
        refetchInventory: loadInventoryData
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);
