
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useStore } from "@/contexts/StoreContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Customer } from "@/types";
import { registerStoreCustomer } from "@/services/transactions/customerDataService";
import { toast } from "sonner";

interface CustomerRegisterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerRegistered: (customer: Customer) => void;
}

export default function CustomerRegisterDialog({ 
  isOpen, 
  onClose,
  onCustomerRegistered
}: CustomerRegisterDialogProps) {
  const { currentStore } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Omit<Customer, "id">>();
  
  const onSubmit = async (data: Omit<Customer, "id">) => {
    if (!currentStore) {
      toast.error("Please select a store first");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const customer = await registerStoreCustomer(data, currentStore.id);
      if (customer) {
        onCustomerRegistered(customer);
        reset();
      }
    } catch (error) {
      console.error("Error registering customer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        reset();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register New Customer</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
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
              {...register("phone", { required: "Phone number is required" })}
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

          <div className="space-y-2">
            <Label htmlFor="tin">TIN (Tax Identification Number)</Label>
            <Input 
              id="tin"
              {...register("tin")}
              placeholder="Optional"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
