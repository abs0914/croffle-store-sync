
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateManager } from "@/services/manager";
import { Manager, ManagerFormData } from "@/types/manager";
import { toast } from "sonner";

export function useManagerForm(manager: Manager | null, onOpenChange: (open: boolean) => void) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ManagerFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    storeIds: [],
    isActive: true
  });

  useEffect(() => {
    if (manager) {
      setFormData({
        firstName: manager.first_name || "",
        lastName: manager.last_name || "",
        contactNumber: manager.contactNumber || "",
        email: manager.email || "",
        storeIds: manager.storeIds || [],
        isActive: manager.isActive
      });
    }
  }, [manager]);

  const updateMutation = useMutation({
    mutationFn: (data: ManagerFormData & { id: string }) => updateManager(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success("Manager updated successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to update manager:", error);
      toast.error("Failed to update manager");
    }
  });

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
    if (!manager) return;

    if (formData.storeIds.length === 0) {
      toast.error("Please assign at least one store to the manager.");
      return;
    }

    updateMutation.mutate({
      id: manager.id,
      ...formData
    });
  };

  return {
    formData,
    isPending: updateMutation.isPending,
    handleInputChange,
    handleStoreChange,
    handleActiveChange,
    handleSubmit
  };
}
