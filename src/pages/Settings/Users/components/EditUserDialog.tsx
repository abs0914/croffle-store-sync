
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAppUser, resetAppUserPassword } from "@/services/appUser";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import UserFormFields from "./UserFormFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
  stores: Store[];
}

export default function EditUserDialog({ isOpen, onOpenChange, user, stores }: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  
  const [formData, setFormData] = useState<AppUserFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    role: user?.role || "cashier",
    storeIds: [],
    isActive: true
  });
  
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const updateMutation = useMutation({
    mutationFn: updateAppUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      onOpenChange(false);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetAppUserPassword,
    onSuccess: () => {
      setIsResettingPassword(false);
    },
    onError: () => {
      setIsResettingPassword(false);
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
        storeIds: user.storeIds,
        isActive: user.isActive
      });
    }
  }, [user]);

  const handleChange = (field: keyof AppUserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordReset = () => {
    if (!user?.email) {
      toast.error("User has no email address");
      return;
    }
    
    setIsResettingPassword(true);
    resetPasswordMutation.mutate(user.email);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <UserFormFields
            formData={formData}
            onChange={handleChange}
            stores={stores}
          />
          
          {/* Password Reset Section - Only visible to admins */}
          {isAdmin && user?.email && user?.userId && (
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Password Management</h4>
                <Button 
                  variant="outline" 
                  size="sm" 
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Sending email...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This will send a password reset link to the user's email
              </p>
            </div>
          )}
          
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
