
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer } from "@/types";
import { User } from "lucide-react";
import { createOrUpdateCustomer } from "@/services/transactions";
import { CustomerForm } from "./index";
import { CustomerSearchForm } from "./index";
import { CustomerDisplay } from "./index";

interface CustomerLookupProps {
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export default function CustomerLookup({ onSelectCustomer, selectedCustomer }: CustomerLookupProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewCustomerForm, setIsNewCustomerForm] = useState(false);
  const [initialPhone, setInitialPhone] = useState("");

  const handleCustomerFound = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsDialogOpen(false);
  };

  const handleCreateCustomer = async (data: Omit<Customer, "id"> & { id?: string }) => {
    const customer = await createOrUpdateCustomer(data);
    if (customer) {
      onSelectCustomer(customer);
      setIsDialogOpen(false);
      setIsNewCustomerForm(false);
      setInitialPhone("");
    }
  };

  const clearCustomer = () => {
    onSelectCustomer(null);
  };

  const handleShowNewCustomerForm = (phone: string = "") => {
    setIsNewCustomerForm(true);
    setInitialPhone(phone);
  };

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setIsNewCustomerForm(false);
          setInitialPhone("");
        }
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <User className="mr-2 h-4 w-4" />
            {selectedCustomer ? selectedCustomer.name : "Select Customer"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNewCustomerForm ? "Add New Customer" : "Find Customer"}</DialogTitle>
          </DialogHeader>

          {isNewCustomerForm ? (
            <CustomerForm 
              initialData={{ phone: initialPhone }}
              onSubmit={handleCreateCustomer}
              onBack={() => setIsNewCustomerForm(false)}
            />
          ) : (
            <CustomerSearchForm 
              onCustomerFound={handleCustomerFound}
              onCreateNew={handleShowNewCustomerForm}
              onClearCustomer={() => {
                clearCustomer();
                setIsDialogOpen(false);
              }}
              selectedCustomer={selectedCustomer}
            />
          )}
        </DialogContent>
      </Dialog>

      {selectedCustomer && <CustomerDisplay customer={selectedCustomer} onClear={clearCustomer} />}
    </div>
  );
}
