
import { useState } from "react";
import { Manager } from "@/types/manager";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ManagerFormFields from "./ManagerFormFields";
import { useManagerForm } from "../hooks/useManagerForm";
import AuthFormFields from "@/components/shared/AuthFormFields";
import { resetManagerPassword } from "@/services/manager";

interface EditManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  manager: Manager | null;
  stores: Store[];
}

export default function EditManagerDialog({ 
  isOpen, 
  onOpenChange, 
  manager, 
  stores 
}: EditManagerDialogProps) {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const {
    formData,
    isPending,
    handleInputChange,
    handleStoreChange,
    handleActiveChange,
    handleSubmit
  } = useManagerForm(manager, onOpenChange);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manager || !manager.email) {
      toast.error("Cannot reset password: No email address linked to this manager");
      return;
    }
    
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setIsResettingPassword(true);
    
    try {
      const success = await resetManagerPassword(manager.id, newPassword);
      
      if (success) {
        toast.success("Password reset successfully");
        setNewPassword("");
        setShowPasswordSection(false);
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(`Failed to reset password: ${error.message}`);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Manager</DialogTitle>
          <DialogDescription>
            Update manager details and store assignments.
          </DialogDescription>
        </DialogHeader>
        
        {manager && (
          <form onSubmit={handleSubmit}>
            <ManagerFormFields
              formData={formData}
              stores={stores}
              onInputChange={handleInputChange}
              onStoreChange={handleStoreChange}
              onActiveChange={handleActiveChange}
              isEditMode={true}
            />
            
            {/* Password Reset Section - Only visible to admins */}
            {isAdmin && manager.email && (
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
                      <Label htmlFor="managerNewPassword">New Password</Label>
                      <Input
                        id="managerNewPassword"
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
            
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
