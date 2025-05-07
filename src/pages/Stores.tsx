
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Spinner } from "@/components/ui/spinner";
import StoresList from "@/components/stores/StoresList";
import StoresHeader from "@/components/stores/StoresHeader";

export default function Stores() {
  const { hasPermission } = useAuth();
  const { stores, isLoading } = useStore();

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
      <StoresList stores={stores} />
    </div>
  );
}
