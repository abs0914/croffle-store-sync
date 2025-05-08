
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
  const appUrl = window.location.origin;
  
  useEffect(() => {
    if (id) {
      fetchStore();
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
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      setStore(data as Store);
    } catch (error: any) {
      console.error("Error fetching store:", error);
      toast.error("Failed to load store details");
      navigate("/stores");
    } finally {
      setIsLoading(false);
    }
  };
  
  return { isLoading, store, qrValue };
};
