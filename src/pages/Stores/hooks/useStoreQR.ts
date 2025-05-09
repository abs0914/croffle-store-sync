
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
      // Use the more permissive .select() instead of .maybeSingle()
      // And make sure to use public data only
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
        setStore(data as Store);
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
