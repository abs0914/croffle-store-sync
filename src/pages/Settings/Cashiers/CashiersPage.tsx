
import { useState, useEffect } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { CashiersTable, AddCashierDialog } from './components';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Cashier } from '@/types/cashier';
import { fetchCashiers } from '@/services/cashier';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

const CashiersPage = () => {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdminOrOwner, setIsAdminOrOwner] = useState(false);

  useEffect(() => {
    if (user && user.role) {
      setIsAdminOrOwner(['admin', 'owner'].includes(user.role));
    }
  }, [user]);

  useEffect(() => {
    loadCashiers();
  }, [currentStore]);

  const loadCashiers = async () => {
    if (!currentStore) return;
    
    try {
      setLoading(true);
      const cashiersList = await fetchCashiers(currentStore.id);
      setCashiers(cashiersList);
    } catch (error) {
      console.error("Error loading cashiers:", error);
      toast.error("Failed to load cashiers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCashierAdded = () => {
    loadCashiers();
    setIsDialogOpen(false);
    toast.success("Cashier added successfully");
  };

  const handleCashierUpdated = () => {
    loadCashiers();
    toast.success("Cashier updated successfully");
  };

  const handleCashierDeleted = () => {
    loadCashiers();
    toast.success("Cashier deleted successfully");
  };

  if (!currentStore) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-lg text-gray-500">Please select a store to manage cashiers</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cashiers Management</h1>
        {isAdminOrOwner && (
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Cashier
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cashiers for {currentStore.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CashiersTable
            cashiers={cashiers}
            loading={loading}
            onCashierUpdated={handleCashierUpdated}
            onCashierDeleted={handleCashierDeleted}
            isAdminOrOwner={isAdminOrOwner}
          />
        </CardContent>
      </Card>

      <AddCashierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        storeId={currentStore.id}
        onCashierAdded={handleCashierAdded}
      />
    </div>
  );
};

export default CashiersPage;
