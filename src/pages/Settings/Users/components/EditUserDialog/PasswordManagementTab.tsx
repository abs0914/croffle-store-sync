
import { useState } from "react";
import { setUserPassword } from "@/services/appUser/appUserAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PasswordManagementTabProps {
  userEmail: string;
}

export default function PasswordManagementTab({ userEmail }: PasswordManagementTabProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleResetPassword = async () => {
    // Reset any previous error message
    setErrorMessage(null);
    
    if (!password) {
      setErrorMessage("Password is required");
      return;
    }
    
    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long");
      return;
    }

    setIsResetting(true);
    try {
      const success = await setUserPassword(userEmail, password);
      if (success) {
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error("Error during password reset:", error);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };
  
  if (!userEmail) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        User email not available. Cannot reset password.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Set a new password for user: <span className="font-medium">{userEmail}</span>
      </div>
      
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
        />
      </div>
      
      <Button
        type="button"
        onClick={handleResetPassword}
        disabled={isResetting || !password || !confirmPassword}
        className="w-full mt-2"
      >
        {isResetting ? <Spinner className="mr-2 h-4 w-4" /> : null}
        Reset Password
      </Button>
    </div>
  );
}
