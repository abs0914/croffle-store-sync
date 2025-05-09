
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Store } from "@/types";

interface UseCustomerFormProps {
  storeId: string | undefined;
}

interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
}

export const useCustomerForm = ({ storeId }: UseCustomerFormProps) => {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<CustomerFormState>({
    name: "",
    phone: "",
    email: "",
  });
  
  const updateFormField = (field: keyof CustomerFormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
    });
  };

  const fetchStore = async () => {
    try {
      // Create a client specifically for public access
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, logo_url")
        .eq("id", storeId)
        .single();
        
      if (error) throw error;
      
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error("Please fill in required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Insert customer data using anonymous access
      const { error } = await supabase
        .from("customers")
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          store_id: storeId,
        });
      
      if (error) throw error;
      
      // Show success message
      setIsSuccess(true);
      toast.success("Thank you for joining our loyalty program!");
      
      // Reset form
      resetForm();
      
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    store,
    isLoading,
    isSubmitting,
    isSuccess,
    error,
    formData,
    updateFormField,
    fetchStore,
    handleSubmit,
    setIsSuccess,
  };
};
