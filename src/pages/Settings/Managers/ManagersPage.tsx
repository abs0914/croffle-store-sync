
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { fetchManagers } from "@/services/manager";
import { Manager } from "@/types/manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlusIcon } from "lucide-react";
import { 
  ManagersTable, 
  AddManagerDialog, 
  EditManagerDialog, 
  DeleteManagerDialog 
} from "./components";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

export default function ManagersPage() {
  const { currentStore, stores } = useStore();
  const { hasPermission, user } = useAuth();
  const isAdmin = hasPermission('admin');
  const isManager = user?.role === 'manager';
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);

  // Fetch managers for the current store or all stores if admin
  const { data: managers = [], isLoading, error } = useQuery({
    queryKey: ["managers", isAdmin ? "all" : currentStore?.id],
    queryFn: () => isAdmin 
      ? fetchManagers() 
      : (currentStore ? fetchManagers(currentStore.id) : Promise.resolve([])),
    enabled: isAdmin || !!currentStore,
    // Add error handling for RLS policy issues
    meta: {
      onError: (err: any) => {
        console.error("Error fetching managers:", err);
        toast.error("You don't have permission to view managers");
      }
    }
  });

  if (error) {
    console.error("Error fetching managers:", error);
    toast.error("Failed to load managers");
  }

  const handleAddManager = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditManager = (manager: Manager) => {
    setSelectedManager(manager);
    setIsEditDialogOpen(true);
  };

  const handleDeleteManager = (manager: Manager) => {
    setSelectedManager(manager);
    setIsDeleteDialogOpen(true);
  };

  // Manager should not access this page at all - except their own profile
  if (isManager && !isAdmin) {
    const currentManagerData = managers.find(manager => manager.email === user?.email);
    
    if (!currentManagerData) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-medium mb-2">Loading your profile...</h2>
              <p className="text-muted-foreground">Please wait while we retrieve your information.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Manager Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{currentManagerData.first_name} {currentManagerData.last_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{currentManagerData.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact</p>
                <p>{currentManagerData.contactNumber || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className={currentManagerData.isActive ? "text-green-600" : "text-red-600"}>
                  {currentManagerData.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Assigned Stores</p>
              <div className="flex flex-wrap gap-2">
                {currentManagerData.storeIds.map(storeId => {
                  const store = stores.find(s => s.id === storeId);
                  return (
                    <span key={storeId} className="px-2 py-1 bg-muted rounded-md text-sm">
                      {store?.name || "Unknown Store"}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentStore && !isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Please select a store first</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Manager Management</CardTitle>
          <div className="flex space-x-2">
            <Button onClick={handleAddManager}>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              Add Manager
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ManagersTable 
            managers={managers}
            isLoading={isLoading}
            onAdd={handleAddManager}
            onEdit={handleEditManager}
            onDelete={handleDeleteManager}
            allStores={stores}
          />
        </CardContent>
      </Card>

      <AddManagerDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        stores={stores}
      />

      <EditManagerDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        manager={selectedManager}
        stores={stores}
      />

      <DeleteManagerDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        manager={selectedManager}
      />
    </div>
  );
}
