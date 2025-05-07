
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Spinner } from "@/components/ui/spinner";
import StoresList from "@/components/stores/StoresList";
import StoresHeader from "@/components/stores/StoresHeader";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Stores() {
  const { hasPermission } = useAuth();
  const { stores, isLoading, refetchStores } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      await refetchStores();
    } catch (err: any) {
      setError(err.message || "Failed to refresh stores");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Only admin, owner, and manager can access this page
  if (!hasPermission('manager')) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold">Permission Denied</h1>
        <p className="mt-2">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <StoresHeader />
      
      {error ? (
        <div className="bg-destructive/10 border border-destructive rounded-md p-4 mt-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-2" />
            <div>
              <h3 className="font-medium text-destructive">There was an error loading stores</h3>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 flex items-center"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <StoresList stores={stores} />
      )}
    </div>
  );
}
