
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { fetchCustomerByPhone, createOrUpdateCustomer } from "@/services/transactionService";
import { Customer } from "@/types";
import { User, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

interface CustomerLookupProps {
  onSelectCustomer: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
}

export default function CustomerLookup({ onSelectCustomer, selectedCustomer }: CustomerLookupProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewCustomerForm, setIsNewCustomerForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<Customer, "id"> & { id?: string }>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: ""
    }
  });

  const handleSearch = async () => {
    if (!phone || phone.length < 6) {
      toast.error("Please enter a valid phone number");
      return;
    }
    
    setIsSearching(true);
    const customer = await fetchCustomerByPhone(phone);
    setIsSearching(false);
    
    if (customer) {
      onSelectCustomer(customer);
      setIsDialogOpen(false);
      setPhone("");
    } else {
      toast.info("Customer not found. Create a new customer?");
      setIsNewCustomerForm(true);
      reset({ phone });
    }
  };

  const handleCreateCustomer = async (data: Omit<Customer, "id"> & { id?: string }) => {
    const customer = await createOrUpdateCustomer(data);
    if (customer) {
      onSelectCustomer(customer);
      setIsDialogOpen(false);
      setIsNewCustomerForm(false);
      setPhone("");
      reset();
    }
  };

  const clearCustomer = () => {
    onSelectCustomer(null);
  };

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setIsNewCustomerForm(false);
          setPhone("");
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
            <form onSubmit={handleSubmit(handleCreateCustomer)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="name"
                  {...register("name", { required: "Name is required" })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone <span className="text-red-500">*</span></Label>
                <Input 
                  id="phone"
                  {...register("phone", { required: "Phone is required" })}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email"
                  type="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address"
                  {...register("address")}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsNewCustomerForm(false);
                    reset();
                  }}
                >
                  Back to Search
                </Button>
                <Button type="submit">
                  Save Customer
                </Button>
              </div>
            </form>
          ) : (
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
                  onClick={() => {
                    setIsNewCustomerForm(true);
                    reset();
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  New Customer
                </Button>
                {selectedCustomer && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => {
                      clearCustomer();
                      setIsDialogOpen(false);
                    }}
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {selectedCustomer && (
        <div className="mt-2 p-2 border rounded-md bg-muted">
          <p className="font-medium">{selectedCustomer.name}</p>
          <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
          {selectedCustomer.email && <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>}
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-1 h-8 text-xs"
            onClick={clearCustomer}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
