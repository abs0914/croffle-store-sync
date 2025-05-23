
import { useEffect } from "react";
import { User } from "@/contexts/auth";
import { Store } from "@/types/store";

interface UseUserDebugProps {
  user: User | null;
  isAdmin: boolean;
  isOwner: boolean;
  canManageUsers: boolean;
  currentStore: Store | null;
}

export default function useUserDebug({ 
  user, 
  isAdmin, 
  isOwner, 
  canManageUsers, 
  currentStore 
}: UseUserDebugProps) {
  useEffect(() => {
    console.log("=== Users Page Authentication Debug ===");
    console.log("Current user:", user);
    console.log("User role:", user?.role);
    console.log("Is admin:", isAdmin);
    console.log("Is owner:", isOwner);
    console.log("Can manage users:", canManageUsers);
    console.log("Store IDs access:", user?.storeIds);
    console.log("Current store:", currentStore);
  }, [user, isAdmin, isOwner, canManageUsers, currentStore]);
}
