
import { useState } from "react";
import { setUserPassword } from "@/services/appUser/appUserAuth";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PasswordManagementTabProps {
  userEmail: string;
}

export default function PasswordManagementTab({ userEmail }: PasswordManagementTabProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleSendResetEmail = async () => {
    setErrorMessage(null);
    setIsResetting(true);
    
    try {
      const success = await setUserPassword(userEmail, '');
      if (!success) {
        setErrorMessage("Failed to send password reset email");
      }
    } catch (error) {
      console.error("Error sending password reset:", error);
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
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>🔒 Secure Password Management</strong><br />
          For enhanced security, passwords cannot be set directly by administrators. 
          A secure password reset link will be sent to <strong>{userEmail}</strong>. 
          This ensures only the user can set their own password and prevents unauthorized access.
        </AlertDescription>
      </Alert>
      
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      <Button
        type="button"
        onClick={handleSendResetEmail}
        disabled={isResetting}
        className="w-full mt-2"
        variant="outline"
      >
        {isResetting ? <Spinner className="mr-2 h-4 w-4" /> : null}
        Send Password Reset Email
      </Button>
      
      <div className="text-xs text-muted-foreground mt-2 p-3 bg-muted rounded-md">
        <strong>How it works:</strong>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>User receives a secure reset link via email</li>
          <li>Link expires after a limited time</li>
          <li>User sets their own password securely</li>
          <li>Admin cannot view or set passwords directly</li>
        </ul>
      </div>
    </div>
  );
}
