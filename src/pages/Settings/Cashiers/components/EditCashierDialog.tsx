
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCashier } from "@/services/cashier";
import { CashierFormData, Cashier } from "@/types/cashier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditCashierDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cashier: Cashier | null;
}

export default function EditCashierDialog({ isOpen, onOpenChange, cashier }: EditCashierDialogProps) {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  
  const [formData, setFormData] = useState<CashierFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    isActive: true
  });
  
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, data: CashierFormData }) => 
      updateCashier({
        id: data.id,
        firstName: data.data.firstName,
        lastName: data.data.lastName,
        contactNumber: data.data.contactNumber,
        isActive: data.data.isActive
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers", cashier?.storeId] });
      onOpenChange(false);
      toast.success("Cashier updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update cashier: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string, password: string }) => {
      if (!userId) throw new Error("User ID is required");
      
      const { error } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      setNewPassword("");
      setShowPasswordSection(false);
      setIsResettingPassword(false);
    },
    onError: (error) => {
      toast.error(`Failed to reset password: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsResettingPassword(false);
    }
  });

  useEffect(() => {
    if (cashier) {
      setFormData({
        firstName: cashier.firstName,
        lastName: cashier.lastName,
        contactNumber: cashier.contactNumber || "",
        isActive: cashier.isActive
      });
      setShowPasswordSection(false);
      setNewPassword("");
    }
  }, [cashier]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isActive: checked
    }));
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cashier || !cashier.userId) {
      toast.error("Cannot reset password: No user account linked to this cashier");
      return;
    }
    
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setIsResettingPassword(true);
    resetPasswordMutation.mutate({ 
      userId: cashier.userId, 
      password: newPassword 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashier) {
      updateMutation.mutate({
        id: cashier.id,
        data: formData
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cashier</DialogTitle>
          <DialogDescription>
            Update cashier information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contactNumber">Contact Number</Label>
              <Input
                id="edit-contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
            
            {/* Password Reset Section - Only visible to admins */}
            {isAdmin && cashier?.userId && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Password Management</h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                  >
                    {showPasswordSection ? "Cancel" : "Reset Password"}
                  </Button>
                </div>
                
                {showPasswordSection && (
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full"
                        minLength={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 6 characters long
                      </p>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      disabled={isResettingPassword || !newPassword || newPassword.length < 6}
                      onClick={handlePasswordReset}
                      className="w-full"
                    >
                      {isResettingPassword ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Resetting Password...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
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
