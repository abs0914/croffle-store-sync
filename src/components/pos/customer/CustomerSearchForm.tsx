
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { fetchCustomerByPhone } from "@/services/transactions";
import { Customer } from "@/types";
import { toast } from "sonner";

interface CustomerSearchFormProps {
  onCustomerFound: (customer: Customer) => void;
  onCreateNew: (phone: string) => void;
  onClearCustomer: () => void;
  selectedCustomer: Customer | null;
}

export default function CustomerSearchForm({ 
  onCustomerFound, 
  onCreateNew, 
  onClearCustomer,
  selectedCustomer 
}: CustomerSearchFormProps) {
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!phone || phone.length < 6) {
      toast.error("Please enter a valid phone number");
      return;
    }
    
    setIsSearching(true);
    const customer = await fetchCustomerByPhone(phone);
    setIsSearching(false);
    
    if (customer) {
      onCustomerFound(customer);
    } else {
      toast.info("Customer not found. Create a new customer?");
      onCreateNew(phone);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          type="button"
          variant="outline"
          onClick={() => onCreateNew("")}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
        
        {selectedCustomer && (
          <Button 
            type="button" 
            variant="destructive"
            onClick={onClearCustomer}
          >
            Clear Selection
          </Button>
        )}
      </div>
    </>
  );
}
