
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCashiers } from "@/services/cashier";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Cashier } from "@/types/cashier";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CashiersTable, AddCashierDialog, EditCashierDialog, DeleteCashierDialog } from "./components";
import { Plus } from "lucide-react";

export default function CashiersPage() {
  const { currentStore } = useStore();
  const storeId = currentStore?.id || '';
  const { user } = useAuth();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: cashiers = [], isLoading } = useQuery({
    queryKey: ["cashiers", storeId],
    queryFn: () => fetchCashiers(storeId),
    enabled: !!storeId,
  });

  const handleEditCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsDeleteDialogOpen(true);
  };

  const handleCashierAdded = () => {
    // Additional logic after cashier is added if needed
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <PageHeader 
          heading="Cashier Management" 
          subheading="Add and manage cashiers for your store" 
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Cashier
        </Button>
      </div>

      <CashiersTable 
        cashiers={cashiers} 
        isLoading={isLoading}
        onEdit={handleEditCashier}
        onDelete={handleDeleteCashier}
        onAdd={() => setIsAddDialogOpen(true)}
      />

      <AddCashierDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        storeId={storeId}
        onCashierAdded={handleCashierAdded}
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
