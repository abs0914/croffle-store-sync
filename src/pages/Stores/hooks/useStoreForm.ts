
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types";

interface StoreFormData {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  is_active: boolean;
}

export const useStoreForm = (id?: string) => {
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "Philippines",
    phone: "",
    email: "",
    tax_id: "",
    is_active: true
  });
  
  useEffect(() => {
    if (isEditing) {
      fetchStoreDetails();
    }
  }, [id]);
  
  const fetchStoreDetails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setFormData(data);
      }
    } catch (error: any) {
      console.error("Error fetching store details:", error);
      toast.error("Failed to load store details");
      navigate("/stores");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Validate required fields
      if (!formData.name || !formData.address) {
        toast.error("Please fill in all required fields");
        setIsSaving(false);
        return;
      }
      
      if (isEditing) {
        // Update existing store
        const { error } = await supabase
          .from("stores")
          .update(formData)
          .eq("id", id);
          
        if (error) throw error;
        
        toast.success("Store updated successfully");
      } else {
        // Create new store
        const { error } = await supabase
          .from("stores")
          .insert(formData);
          
        if (error) throw error;
        
        toast.success("Store created successfully");
      }
      
      navigate("/stores");
    } catch (error: any) {
      console.error("Error saving store:", error);
      toast.error(error.message || "Failed to save store");
    } finally {
      setIsSaving(false);
    }
  };
  
  return {
    isEditing,
    isLoading,
    isSaving,
    formData,
    handleChange,
    handleSwitchChange,
    handleSubmit,
  };
};
