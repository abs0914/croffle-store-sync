
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";
import { toast } from "sonner";

export interface StoreDataState {
  isLoading: boolean;
  store: Store | null;
  error: string | null;
}

export const useStoreData = (storeId: string | undefined) => {
  const [state, setState] = useState<StoreDataState>({
    isLoading: true,
    store: null,
    error: null
  });

  useEffect(() => {
    if (storeId) {
      fetchStore(storeId);
    } else {
      setState({
        isLoading: false,
        store: null,
        error: "Store ID is missing"
      });
    }
  }, [storeId]);

  const fetchStore = async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, address, phone, email, logo_url")
        .eq("id", id)
        .single();
        
      if (error) {
        console.error("Error fetching store:", error);
        throw error;
      }
      
      if (data) {
        setState({
          isLoading: false,
          store: data as Store,
          error: null
        });
      } else {
        setState({
          isLoading: false,
          store: null,
          error: "Store not found"
        });
      }
    } catch (error: any) {
      console.error("Error fetching store:", error);
      setState({
        isLoading: false,
        store: null,
        error: "Failed to load store information"
      });
      toast.error("Failed to load store information");
    }
  };

  return {
    ...state,
    fetchStore
  };
};
