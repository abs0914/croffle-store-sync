
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Cashier } from "@/types/cashier";

interface EnhancedCashierSelectorProps {
  cashiers: Cashier[];
  selectedCashierId: string | null;
  setSelectedCashierId: (id: string | null) => void;
  isLoading: boolean;
  allowSelection?: boolean; // For role-based restrictions
}

export default function EnhancedCashierSelector({
  cashiers,
  selectedCashierId,
  setSelectedCashierId,
  isLoading,
  allowSelection = true
}: EnhancedCashierSelectorProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter cashiers based on search term
  const filteredCashiers = cashiers.filter(cashier =>
    cashier.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if current user can select cashiers (managers and admins can, cashiers cannot)
  const canSelectOtherCashiers = user?.role === 'manager' || user?.role === 'admin';
  
  // Find current user's cashier record
  const currentUserCashier = cashiers.find(cashier => cashier.userId === user?.id);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Cashier</Label>
        <div className="flex items-center space-x-2">
          <Spinner className="h-4 w-4" />
          <span className="text-sm">Loading cashiers...</span>
        </div>
      </div>
    );
  }

  if (!allowSelection || (!canSelectOtherCashiers && currentUserCashier)) {
    // Show read-only cashier info for restricted users
    const displayCashier = currentUserCashier || cashiers.find(c => 
      c.id === selectedCashierId || 
      (selectedCashierId?.startsWith('app_user:') && c.id === selectedCashierId.replace('app_user:', ''))
    );
    
    return (
      <div className="space-y-2">
        <Label>Cashier</Label>
        {displayCashier ? (
          <div className="p-3 border rounded-md bg-background">
            <p className="font-medium">{displayCashier.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {canSelectOtherCashiers ? 'Selected cashier' : 'Logged in as cashier'}
            </p>
            {displayCashier.contactNumber && (
              <p className="text-xs text-muted-foreground">{displayCashier.contactNumber}</p>
            )}
          </div>
        ) : (
          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
            No cashier account found. Please contact your administrator.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="cashier-select">Select Cashier</Label>
      
      {/* Search input for large cashier lists */}
      {cashiers.length > 5 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search cashiers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}
      
      <Select 
        value={selectedCashierId || ""} 
        onValueChange={(value) => setSelectedCashierId(value || null)}
      >
        <SelectTrigger id="cashier-select">
          <SelectValue placeholder="Choose a cashier..." />
        </SelectTrigger>
        <SelectContent>
          {filteredCashiers.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              {searchTerm ? 'No cashiers found matching search' : 'No active cashiers found'}
            </div>
          ) : (
            filteredCashiers.map((cashier) => {
              const cashierId = cashier.userId ? `app_user:${cashier.id}` : cashier.id;
              return (
                <SelectItem key={cashier.id} value={cashierId}>
                  <div className="flex flex-col">
                    <span className="font-medium">{cashier.fullName}</span>
                    {cashier.contactNumber && (
                      <span className="text-xs text-muted-foreground">{cashier.contactNumber}</span>
                    )}
                  </div>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
      
      {filteredCashiers.length === 0 && !searchTerm && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
          No active cashiers found for this store. Please contact your administrator.
        </div>
      )}
    </div>
  );
}
