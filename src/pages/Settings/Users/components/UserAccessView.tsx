
import { Card, CardContent } from "@/components/ui/card";
import { AppUser } from "@/types/appUser";
import { Store } from "@/types/store";
import UserProfile from "./UserProfile";
import ErrorView from "./ErrorView";
import LoadingView from "./LoadingView";

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
  // Manager view - only see their own profile
  if (isManager) {
    const currentUserData = users.find(u => u.email === currentUserEmail);
    
    if (!currentUserData && !isLoading) {
      return (
        <ErrorView 
          error={new Error("Unable to load your user profile")} 
          onRetry={refetch} 
        />
      );
    }
    
    if (!currentUserData) {
      return <LoadingView />;
    }

    return <UserProfile user={currentUserData} stores={stores} />;
  }

  // Store selection required
  if (!currentStoreExists) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Please select a store first</div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
