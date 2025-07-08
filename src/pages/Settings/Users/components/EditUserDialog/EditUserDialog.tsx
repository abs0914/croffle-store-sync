
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppUser } from "@/services/appUser";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { Store } from "@/types/store";
import { useRolePermissions } from "@/contexts/RolePermissionsContext";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserFormTab from "./UserFormTab";
import PasswordManagementTab from "./PasswordManagementTab";
import DialogHeader from "./DialogHeader";
import DialogFooter from "./DialogFooter";

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
  stores: Store[];
}

export default function EditUserDialog({ isOpen, onOpenChange, user, stores }: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useRolePermissions();
  const { user: currentUser } = useAuth();
  // TEMPORARY FIX: Force admin users to have user management permissions
  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'owner' || hasPermission('user_management');
  
  const [activeTab, setActiveTab] = useState<string>("general");
  const [formData, setFormData] = useState<AppUserFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
        role: user?.role || "cashier",
        storeIds: [],
        isActive: true,
        customPermissions: undefined
      });

  const updateMutation = useMutation({
    mutationFn: updateAppUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      onOpenChange(false);
      toast.success("User updated successfully");
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      toast.error("Failed to update user: " + (error as Error).message);
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        userId: user.userId || undefined,
        firstName: user.firstName,
        lastName: user.lastName,
        contactNumber: user.contactNumber || "",
        email: user.email || "",
        role: user.role,
        storeIds: user.storeIds || [],
        isActive: user.isActive,
        customPermissions: user.customPermissions
      });
    }
  }, [user]);

  const handleChange = (field: keyof AppUserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      updateMutation.mutate({
        ...formData,
        id: user.id
      });
    }
  };

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader />
        
        {canManageUsers && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">User Details</TabsTrigger>
              <TabsTrigger value="password">Password Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="mt-4">
              <form id="user-form" onSubmit={handleSubmit}>
                <UserFormTab 
                  formData={formData}
                  onChange={handleChange}
                  stores={stores}
                />
              </form>
            </TabsContent>
            
            <TabsContent value="password" className="mt-4">
              <PasswordManagementTab userEmail={user?.email || ""} />
            </TabsContent>
          </Tabs>
        )}
        
        <DialogFooter 
          isPending={updateMutation.isPending}
          onClose={handleClose}
          activeTab={activeTab}
        />
      </DialogContent>
    </Dialog>
  );
}
