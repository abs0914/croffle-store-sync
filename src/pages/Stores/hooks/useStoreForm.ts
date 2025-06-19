
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
  location_type?: string;
  region?: string;
  logistics_zone?: string;
  shipping_cost_multiplier?: number;
  ownership_type?: 'company_owned' | 'franchisee';
  franchise_agreement_date?: string;
  franchise_fee_percentage?: number;
  franchisee_contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  is_active: boolean;
}

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useStoreForm = (id?: string) => {
  const navigate = useNavigate();
  const isEditing = !!id && id !== "new";
  
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
    location_type: "inside_cebu",
    region: "",
    logistics_zone: "",
    shipping_cost_multiplier: 1.0,
    ownership_type: "company_owned",
    franchise_agreement_date: "",
    franchise_fee_percentage: 0,
    franchisee_contact_info: {
      name: "",
      email: "",
      phone: "",
      address: ""
    },
    is_active: true
  });
  
  useEffect(() => {
    // Only fetch store details if we're editing and have a valid UUID
    if (id && id !== "new" && isValidUUID(id)) {
      fetchStoreDetails();
    }
  }, [id]);
  
  const fetchStoreDetails = async () => {
    if (!id || id === "new" || !isValidUUID(id)) {
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Cast the data to proper types
        const ownershipType = (data.ownership_type as 'company_owned' | 'franchisee') || 'company_owned';
        let franchiseeContactInfo = {
          name: "",
          email: "",
          phone: "",
          address: ""
        };

        // Parse franchisee contact info if it exists
        if (data.franchisee_contact_info && typeof data.franchisee_contact_info === 'object') {
          const contactInfo = data.franchisee_contact_info as any;
          franchiseeContactInfo = {
            name: contactInfo.name || "",
            email: contactInfo.email || "",
            phone: contactInfo.phone || "",
            address: contactInfo.address || ""
          };
        }

        setFormData({
          ...data,
          shipping_cost_multiplier: data.shipping_cost_multiplier || 1.0,
          ownership_type: ownershipType,
          franchise_fee_percentage: data.franchise_fee_percentage || 0,
          franchisee_contact_info: franchiseeContactInfo
        });
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
    setFormData((prev) => ({ 
      ...prev, 
      [name]: name === 'shipping_cost_multiplier' ? parseFloat(value) || 1.0 :
              name === 'franchise_fee_percentage' ? parseFloat(value) || 0 :
              value 
    }));
  };

  const handleSelectChange = (field: string, value: string) => {
    if (field === 'franchisee_contact_info') {
      try {
        const parsedInfo = JSON.parse(value);
        setFormData((prev) => ({ ...prev, franchisee_contact_info: parsedInfo }));
      } catch {
        // If parsing fails, treat as a simple string update for a single field
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
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

      // Prepare data for submission
      const submitData = {
        ...formData,
        franchise_agreement_date: formData.franchise_agreement_date || null,
        franchise_fee_percentage: formData.ownership_type === 'franchisee' ? formData.franchise_fee_percentage : 0,
        franchisee_contact_info: formData.ownership_type === 'franchisee' ? formData.franchisee_contact_info : null
      };
      
      if (isEditing) {
        // Update existing store
        const { error } = await supabase
          .from("stores")
          .update(submitData)
          .eq("id", id);
          
        if (error) throw error;
        
        toast.success("Store updated successfully");
      } else {
        // Create new store
        const { error } = await supabase
          .from("stores")
          .insert(submitData);
          
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
    handleSelectChange,
    handleSwitchChange,
    handleSubmit,
  };
};
