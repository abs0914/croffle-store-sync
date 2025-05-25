
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAppUsers, fetchCurrentUserInfo } from "@/services/appUser";
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
        userEmail: user.email,
        storeId: currentStore?.id
      });

      try {

        // Determine whether to fetch all users or store-specific users
        if (user.role === 'admin' || user.role === 'owner') {
          // Admins and owners can see all users
          console.log("Fetching all users (admin/owner access)");
          const allUsers = await fetchAppUsers();
          console.log(`Fetched ${allUsers.length} users with admin/owner access`);
          return allUsers;
        } else if (currentStore) {
          // Other roles see only users from their current store
          console.log(`Fetching users for store: ${currentStore.id}`);
          const storeUsers = await fetchAppUsers(currentStore.id);
          console.log(`Fetched ${storeUsers.length} users for store ${currentStore.id}`);
          return storeUsers;
        } else if (user.email) {
          // No store selected, just fetch the current user's info
          console.log("Fetching only current user info");
          const currentUserInfo = await fetchCurrentUserInfo(user.email);
          return currentUserInfo ? [currentUserInfo] : [];
        } else {
          console.log("No store selected and no email for user");
          return [];
        }
      } catch (fetchError: any) {
        console.error("Error in users query function:", fetchError);

        // Check for specific errors
        if (fetchError.message.includes('Database permission error')) {
          toast.error("Database permission error - Please contact support");
        } else if (fetchError.message.includes('function') && fetchError.message.includes('does not exist')) {
          toast.error("Database function missing - Please check database setup");
        } else {
          toast.error("Failed to load users: " + (fetchError.message || "Unknown error"));
        }
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
