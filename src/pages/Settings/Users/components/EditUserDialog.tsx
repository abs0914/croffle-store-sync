
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
import { AlertTriangle, Key, RefreshCw } from "lucide-react";

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
      toast.success("User updated successfully");
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetAppUserPassword,
    onSuccess: () => {
      setIsResettingPassword(false);
      toast.success(`Password reset email sent to ${user?.email}`);
    },
    onError: (error: any) => {
      setIsResettingPassword(false);
      toast.error(`Failed to send password reset email: ${error.message}`);
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
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <Key className="h-4 w-4" />
                    Password Management
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send a password reset link to the user's email
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="gap-1"
                >
                  {isResettingPassword ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Sending email...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Reset Password
                    </>
                  )}
                </Button>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-3">
                <div className="flex gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-xs">
                    The user will need to click the reset link sent to their email and create a new password.
                    The reset link will expire after 24 hours.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-4 mt-4">
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
