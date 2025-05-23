import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAppUsers } from "@/services/appUser";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

export default function useUsersData() {
  const { currentStore } = useStore();
  const { user } = useAuth();
  
  // Fetch users with React Query
  const { 
    data: users = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["app_users", currentStore?.id, user?.id],
    queryFn: async () => {
      if (!user) {
        console.log("No authenticated user, skipping user fetch");
        return [];
      }
      
      console.log("Fetching users with params:", {
        userRole: user.role,
        userId: user.id,
        storeId: currentStore?.id
      });
      
      try {
        // Determine whether to fetch all users or store-specific users
        let result;
        if (user.role === 'admin' || user.role === 'owner') {
          // Admins and owners can see all users
          console.log("Fetching all users (admin/owner access)");
          result = await fetchAppUsers();
        } else if (currentStore) {
          // Other roles see only users from their current store
          console.log(`Fetching users for store: ${currentStore.id}`);
          result = await fetchAppUsers(currentStore.id);
        } else {
          console.log("No store selected for non-admin user");
          return [];
        }
          
        console.log(`Successfully fetched ${result.length} users`);
        return result;
      } catch (fetchError: any) {
        console.error("Error in users query function:", fetchError);
        toast.error("Failed to load users: " + (fetchError.message || "Unknown error"));
        throw fetchError;
      }
    },
    enabled: !!user,
    retry: 1,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
  });

  // Auto refresh when visibility changes or user/store changes
  useEffect(() => {
    const refreshData = () => {
      if (user) {
        refetch();
      }
    };

    // Refresh on page visibility change (user coming back to tab)
    document.addEventListener('visibilitychange', refreshData);
    
    // Initial refresh
    refreshData();
    
    return () => {
      document.removeEventListener('visibilitychange', refreshData);
    };
  }, [refetch, user, currentStore]);

  return {
    users,
    isLoading,
    error,
    refetch
  };
}
