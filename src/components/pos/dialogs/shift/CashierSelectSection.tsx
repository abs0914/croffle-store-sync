
import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth";
import { Cashier } from "@/types/cashier";

interface CashierSelectSectionProps {
  cashiers: Cashier[];
  selectedCashierId: string | null;
  setSelectedCashierId: (id: string | null) => void;
  isLoading: boolean;
}

export default function CashierSelectSection({
  cashiers,
  selectedCashierId,
  setSelectedCashierId,
  isLoading
}: CashierSelectSectionProps) {
  const { user } = useAuth();
  
  // Find the cashier record matching the authenticated user
  const currentCashier = user && cashiers.length > 0 
    ? cashiers.find(cashier => cashier.userId === user.id) 
    : null;
  
  // Update the selected cashier ID when the current cashier is found
  useEffect(() => {
    if (currentCashier) {
      setSelectedCashierId(currentCashier.id);
    }
  }, [currentCashier, setSelectedCashierId]);

  return (
    <div className="space-y-2">
      <Label htmlFor="cashier">
        Cashier
      </Label>
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <Spinner className="h-4 w-4" />
          <span className="text-sm">Loading cashier information...</span>
        </div>
      ) : currentCashier ? (
        <div className="p-2 border rounded-md bg-background">
          <p className="font-medium">{currentCashier.fullName}</p>
          <p className="text-xs text-muted-foreground">Logged in as cashier</p>
        </div>
      ) : (
        <div className="text-sm text-amber-600">
          No cashier account found for your user. Please contact your administrator.
        </div>
      )}
    </div>
  );
}
