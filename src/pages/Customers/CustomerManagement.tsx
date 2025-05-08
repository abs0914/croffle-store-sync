
import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { searchCustomers } from "@/services/transactions/customerDataService";
import { Customer } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus } from "lucide-react";
import CustomerRegisterDialog from "./components/CustomerRegisterDialog";
import CustomerDetailView from "./components/CustomerDetailView";

export default function CustomerManagement() {
  const { currentStore } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    const results = await searchCustomers(searchQuery, currentStore?.id);
    setCustomers(results);
    setIsLoading(false);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleNewCustomerRegistered = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomers(prev => [customer, ...prev]);
    setIsRegisterDialogOpen(false);
  };

  useEffect(() => {
    if (currentStore) {
      searchCustomers("", currentStore.id)
        .then(results => setCustomers(results))
        .catch(error => console.error("Error fetching customers:", error));
    }
  }, [currentStore]);

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-croffle-primary">Customer Management</h1>
        <Button onClick={() => setIsRegisterDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Register New Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Customer Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or phone..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto space-y-2">
              {customers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {isLoading ? "Searching..." : "No customers found"}
                </p>
              ) : (
                customers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      selectedCustomer?.id === customer.id ? "border-croffle-primary" : ""
                    }`}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <CardContent className="p-3">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer ? (
              <CustomerDetailView customer={selectedCustomer} />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a customer to view details
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerRegisterDialog
        isOpen={isRegisterDialogOpen}
        onClose={() => setIsRegisterDialogOpen(false)}
        onCustomerRegistered={handleNewCustomerRegistered}
      />
    </div>
  );
}
