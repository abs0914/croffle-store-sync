
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";

export const useStoreQR = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const appUrl = window.location.origin;
  
  useEffect(() => {
    if (id) {
      fetchStore();
    } else {
      setError("Store ID is missing");
      setIsLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    if (store) {
      const url = `${appUrl}/customer-form/${store.id}`;
      setQrValue(url);
    }
  }, [store, appUrl]);
  
  const fetchStore = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use .eq() instead of maybeSingle() to avoid authentication issues
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setStore(data[0] as Store);
      } else {
        setError("Store not found");
      }
    } catch (error: any) {
      console.error("Error fetching store:", error);
      setError("Failed to load store information");
    } finally {
      setIsLoading(false);
    }
  };
  
  return { isLoading, store, qrValue, error };
};
