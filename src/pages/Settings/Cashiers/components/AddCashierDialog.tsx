
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCashierWithAuth } from "@/services/cashier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import AuthFormFields from "@/components/shared/AuthFormFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddCashierDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
}

interface CashierFormDataWithAuth {
  firstName: string;
  lastName: string;
  contactNumber: string;
  email: string;
  password: string;
  isActive: boolean;
}

export default function AddCashierDialog({ isOpen, onOpenChange, storeId }: AddCashierDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CashierFormDataWithAuth>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    password: "",
    isActive: true
  });

  const createMutation = useMutation({
    mutationFn: (data: CashierFormDataWithAuth) => 
      createCashierWithAuth({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        storeId: storeId,
        contactNumber: data.contactNumber
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers", storeId] });
      resetForm();
      onOpenChange(false);
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      contactNumber: "",
      email: "",
      password: "",
      isActive: true
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Email and password are required");
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Cashier</DialogTitle>
          <DialogDescription>
            Add a new cashier to this store. The cashier will be able to log into the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
              />
            </div>
            
            <AuthFormFields
              email={formData.email}
              password={formData.password}
              onInputChange={handleInputChange}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Add Cashier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
