
import { useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery } from "@tanstack/react-query";
import { fetchCashiers } from "@/services/cashier";
import { Cashier } from "@/types/cashier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlusIcon } from "lucide-react";
import CashiersTable from "./components/CashiersTable";
import AddCashierDialog from "./components/AddCashierDialog";
import EditCashierDialog from "./components/EditCashierDialog";
import DeleteCashierDialog from "./components/DeleteCashierDialog";

export default function CashiersPage() {
  const { currentStore } = useStore();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);

  // Fetch cashiers for the current store
  const { data: cashiers = [], isLoading } = useQuery({
    queryKey: ["cashiers", currentStore?.id],
    queryFn: () => currentStore ? fetchCashiers(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore
  });

  const handleAddCashier = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsDeleteDialogOpen(true);
  };

  if (!currentStore) {
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
          <CardTitle className="text-xl font-bold">Cashier Management</CardTitle>
          <div className="flex space-x-2">
            <Button onClick={handleAddCashier}>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              Add Cashier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CashiersTable 
            cashiers={cashiers}
            isLoading={isLoading}
            onAdd={handleAddCashier}
            onEdit={handleEditCashier}
            onDelete={handleDeleteCashier}
          />
        </CardContent>
      </Card>

      <AddCashierDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        storeId={currentStore.id}
      />

      <EditCashierDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        cashier={selectedCashier}
      />

      <DeleteCashierDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        cashier={selectedCashier}
      />
    </div>
  );
}
