
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCashiers, createCashierWithAuth } from "@/services/cashier";
import { Cashier } from "@/types/cashier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlusIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import CashiersTable from "./components/CashiersTable";
import AddCashierDialog from "./components/AddCashierDialog";
import EditCashierDialog from "./components/EditCashierDialog";
import DeleteCashierDialog from "./components/DeleteCashierDialog";

export default function CashiersPage() {
  const { currentStore, stores } = useStore();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [isCreatingDemoCashiers, setIsCreatingDemoCashiers] = useState(false);

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

  // Create demo cashiers
  const createDemoCashiers = async () => {
    if (!currentStore || stores.length < 2) {
      toast.error("You need at least two stores to create demo cashiers");
      return;
    }
    
    setIsCreatingDemoCashiers(true);
    try {
      // Find store IDs for specific stores
      const marasbarasStore = stores.find(store => store.name.includes("Marasbaras"));
      const northStore = stores.find(store => store.name.includes("North"));
      
      if (!marasbarasStore || !northStore) {
        toast.error("Couldn't find 'Robinsons Marasbaras' or 'Robinsons North' stores");
        return;
      }
      
      // Create the first cashier for Marasbaras
      const maraResult = await createCashierWithAuth({
        email: 'marasabaras@croffle.com',
        password: 'M4ra$bara$',
        firstName: 'Mara',
        lastName: 'Sabaras',
        storeId: marasbarasStore.id,
        contactNumber: '09123456789'
      });
      
      // Create the second cashier for North
      const robinsonResult = await createCashierWithAuth({
        email: 'robinsons.north@croffle.com',
        password: 'Rbns0nN0rt8',
        firstName: 'Robinson',
        lastName: 'North',
        storeId: northStore.id,
        contactNumber: '09987654321'
      });
      
      if (maraResult && robinsonResult) {
        toast.success('Demo cashiers created successfully');
        queryClient.invalidateQueries({ queryKey: ["cashiers", currentStore.id] });
      }
    } catch (error: any) {
      toast.error(`Failed to create demo cashiers: ${error.message}`);
    } finally {
      setIsCreatingDemoCashiers(false);
    }
  };

  // We'll remove the automatic creation of demo cashiers to avoid duplicate users
  // and allow manual creation instead

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
            <Button disabled={isCreatingDemoCashiers || stores.length < 2} onClick={createDemoCashiers} variant="outline">
              {isCreatingDemoCashiers ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating Demo Cashiers...
                </>
              ) : (
                <>
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Create Demo Cashiers
                </>
              )}
            </Button>
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
