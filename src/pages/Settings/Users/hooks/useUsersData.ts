
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
    queryKey: ["app_users", currentStore?.id],
    queryFn: async () => {
      console.log("Fetching users with params:", {
        userRole: user?.role,
        storeId: currentStore?.id
      });
      
      try {
        // The new RLS policies will handle appropriate filtering
        const users = currentStore 
          ? await fetchAppUsers(currentStore.id) 
          : await fetchAppUsers();
          
        console.log(`Successfully fetched ${users.length} users`);
        return users;
      } catch (fetchError: any) {
        console.error("Error in users query function:", fetchError);
        toast.error("Failed to load users: " + (fetchError.message || "Unknown error"));
        throw fetchError;
      }
    },
    enabled: !!user,
    retry: 3,
    retryDelay: 1000,
  });

  // Auto refresh when visibility changes or user changes
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
  }, [refetch, user]);

  return {
    users,
    isLoading,
    error,
    refetch
  };
}
