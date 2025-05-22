
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { fetchManagers } from "@/services/manager";
import { Manager } from "@/types/manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlusIcon } from "lucide-react";
import ManagersTable from "./components/ManagersTable";
import AddManagerDialog from "./components/AddManagerDialog";
import EditManagerDialog from "./components/EditManagerDialog";
import DeleteManagerDialog from "./components/DeleteManagerDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function ManagersPage() {
  const { currentStore, stores } = useStore();
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission('admin');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);

  // Fetch managers for the current store or all stores if admin
  const { data: managers = [], isLoading } = useQuery({
    queryKey: ["managers", isAdmin ? "all" : currentStore?.id],
    queryFn: () => isAdmin 
      ? fetchManagers() 
      : (currentStore ? fetchManagers(currentStore.id) : Promise.resolve([])),
    enabled: isAdmin || !!currentStore
  });

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
