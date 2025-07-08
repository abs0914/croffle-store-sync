
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAppUserWithAuth } from "@/services/appUser";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { AppUserFormData } from "@/types/appUser";
import { UserRole } from "@/types/user";
import { useRolePermissions } from "@/contexts/RolePermissionsContext";
import UserFormFields from "./UserFormFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
}

export default function AddUserDialog({ isOpen, onOpenChange, stores }: AddUserDialogProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useRolePermissions();

  // Permission check - only users with user_management permission can create users
  const canManageUsers = hasPermission('user_management');



  // Security check: Close dialog and show error if user doesn't have permission
  if (isOpen && !canManageUsers) {
    console.warn('AddUserDialog: Non-admin user attempted to access user creation');
    toast.error("You don't have permission to create users");
    onOpenChange(false);
    return null;
  }

  const [formData, setFormData] = useState<AppUserFormData & { password: string }>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    role: "cashier" as UserRole,
    storeIds: [],
    isActive: true,
    password: ""
  });

  const createMutation = useMutation({
    mutationFn: createAppUserWithAuth,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
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
      role: "cashier" as UserRole,
      storeIds: [],
      isActive: true,
      password: ""
    });
  };

  const handleChange = (field: keyof AppUserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Email and password are required");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }



    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system. The user will be able to log in with the provided credentials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <UserFormFields
            formData={formData}
            onChange={handleChange}
            stores={stores}
            includePassword={true}
          />
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Add User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
