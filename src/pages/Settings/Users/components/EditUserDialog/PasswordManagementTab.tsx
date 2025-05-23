
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { setUserPassword } from "@/services/appUser";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { AlertTriangle, Key } from "lucide-react";
import AuthFormFields from "@/components/shared/AuthFormFields";

interface PasswordManagementTabProps {
  userEmail: string;
}

export default function PasswordManagementTab({ userEmail }: PasswordManagementTabProps) {
  const [passwordData, setPasswordData] = useState({
    email: userEmail || "",
    password: ""
  });
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  
  const setPasswordMutation = useMutation({
    mutationFn: ({ email, password }: { email: string, password: string }) => 
      setUserPassword(email, password),
    onSuccess: () => {
      setIsSettingPassword(false);
      setPasswordData({ email: userEmail || "", password: "" });
      toast.success("Password set successfully");
    },
    onError: (error: any) => {
      setIsSettingPassword(false);
      toast.error(`Failed to set password: ${error.message}`);
    }
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.email || !passwordData.password) {
      toast.error("Email and password are required");
      return;
    }
    
    if (passwordData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    
    setIsSettingPassword(true);
    setPasswordMutation.mutate({
      email: passwordData.email,
      password: passwordData.password
    });
  };

  return (
    <div className="space-y-4">
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium flex items-center gap-1 mb-2">
          <Key className="h-4 w-4" />
          Set New Password
        </h4>
        <p className="text-xs text-muted-foreground mb-4">
          Directly set a new password for this user
        </p>
        
        <form onSubmit={handleSetPassword} className="space-y-4">
          <AuthFormFields
            email={passwordData.email}
            password={passwordData.password}
            onInputChange={handlePasswordChange}
            isEditMode={true}
          />
          
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <div className="flex gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p className="text-xs">
                Use this option with caution. This will immediately change the user's password
                without requiring any verification.
              </p>
            </div>
          </div>
          
          <Button 
            type="submit" 
            variant="secondary"
            disabled={isSettingPassword || !passwordData.password}
            className="w-full"
          >
            {isSettingPassword ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Setting Password...
              </>
            ) : (
              "Set New Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
