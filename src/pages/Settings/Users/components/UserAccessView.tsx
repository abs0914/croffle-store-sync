
import { Card, CardContent } from "@/components/ui/card";
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import UserProfile from "./UserProfile";
import ErrorView from "./ErrorView";
import LoadingView from "./LoadingView";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ShieldAlertIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface UserAccessViewProps {
  isManager: boolean;
  isLoading: boolean;
  error: Error | null;
  currentStoreExists: boolean;
  users: AppUser[];
  currentUserEmail: string | undefined;
  stores: Store[];
  refetch: () => void;
}

export default function UserAccessView({
  isManager,
  isLoading,
  error,
  currentStoreExists,
  users,
  currentUserEmail,
  stores,
  refetch
}: UserAccessViewProps) {
  // Show loading view while data is being fetched
  if (isLoading) {
    return <LoadingView />;
  }

  // Handle permission errors specifically
  if (error && (error.message.includes('policy') || error.message.includes('permission'))) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <ShieldAlertIcon className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Permission Error</h3>
          <p className="text-muted-foreground text-center mb-4">
            You don't have permission to view user data. Please contact an administrator.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Handle other errors
  if (error) {
    return <ErrorView error={error} onRetry={refetch} />;
  }

  // Manager view - only see their own profile
  if (isManager) {
    const currentUserData = users.find(u => u.email === currentUserEmail);
    
    if (!currentUserData) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <p className="text-muted-foreground mb-4">Your user profile was not found.</p>
            <Button onClick={refetch} variant="outline">
              Refresh
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Pass the user prop directly without wrapping in additional props object
    return <UserProfile />;
  }

  // Store selection required
  if (!currentStoreExists) {
    return (
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <p className="text-center mb-4">Please select a store first</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/stores">Select Store</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
