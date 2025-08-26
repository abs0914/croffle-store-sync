
import { useEffect } from "react";
import { User } from "@/contexts/auth";
import { Store } from "@/types/store";

interface UseUserDebugProps {
  user: User | null;
  canManageUsers: boolean;
  currentStore: Store | null;
}

export default function useUserDebug({ 
  user, 
  canManageUsers, 
  currentStore 
}: UseUserDebugProps) {
  const isAdmin = user?.role === 'admin';
  const isOwner = user?.role === 'owner';
  
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
