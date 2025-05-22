
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createManager } from "@/services/manager";
import { ManagerFormData } from "@/types/manager";

export function useAddManagerForm(onOpenChange: (open: boolean) => void) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ManagerFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    storeIds: [],
    isActive: true
  });

  const createMutation = useMutation({
    mutationFn: createManager,
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
      isActive: true
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
      alert("Please assign at least one store to the manager.");
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
