import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createManagerWithAuth } from "@/services/manager";
import { ManagerFormData } from "@/types/manager";
import { toast } from "sonner";

export interface ManagerFormDataWithAuth extends ManagerFormData {
  password: string;
}

export function useAddManagerForm(onOpenChange: (open: boolean) => void) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ManagerFormDataWithAuth>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    storeIds: [],
    isActive: true,
    password: ""
  });

  const createMutation = useMutation({
    mutationFn: (data: ManagerFormDataWithAuth) => createManagerWithAuth({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      contactNumber: data.contactNumber,
      storeIds: data.storeIds
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      resetForm();
      onOpenChange(false);
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      contactNumber: "",
      email: "",
      storeIds: [],
      isActive: true,
      password: ""
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStoreChange = (storeId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      storeIds: checked
        ? [...prev.storeIds, storeId]
        : prev.storeIds.filter(id => id !== storeId)
    }));
  };

  const handleActiveChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isActive: checked
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.storeIds.length === 0) {
      toast.error("Please assign at least one store to the manager.");
      return;
    }
    
    if (!formData.password || formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    
    createMutation.mutate(formData);
  };

  return {
    formData,
    isPending: createMutation.isPending,
    handleInputChange,
    handleStoreChange,
    handleActiveChange,
    handleSubmit
  };
}
