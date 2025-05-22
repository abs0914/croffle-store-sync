
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
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const {
    formData,
    isPending,
    handleInputChange,
    handleStoreChange,
    handleActiveChange,
    handleSubmit
  } = useManagerForm(manager, onOpenChange);

  const handlePasswordReset = async () => {
    if (!manager || !manager.id) {
      toast.error("Cannot reset password: No manager selected");
      return;
    }
    
    setIsResettingPassword(true);
    
    try {
      const success = await resetManagerPassword(manager.id, "");
      
      if (success) {
        toast.success("Password reset link sent to manager's email");
        setShowPasswordSection(false);
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(`Failed to send password reset link: ${error.message}`);
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
                    <p className="text-sm text-muted-foreground">
                      This will send a password reset link to the manager's email: {manager.email}
                    </p>
                    
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      disabled={isResettingPassword}
                      onClick={handlePasswordReset}
                      className="w-full"
                    >
                      {isResettingPassword ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Sending Reset Link...
                        </>
                      ) : (
                        "Send Password Reset Link"
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
