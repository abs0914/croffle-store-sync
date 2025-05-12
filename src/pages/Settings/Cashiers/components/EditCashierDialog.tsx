
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCashier } from "@/services/cashier";
import { CashierFormData, Cashier } from "@/types/cashier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditCashierDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cashier: Cashier | null;
}

export default function EditCashierDialog({ isOpen, onOpenChange, cashier }: EditCashierDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CashierFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    isActive: true
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, data: CashierFormData }) => 
      updateCashier({
        id: data.id,
        firstName: data.data.firstName,
        lastName: data.data.lastName,
        contactNumber: data.data.contactNumber,
        isActive: data.data.isActive
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers", cashier?.storeId] });
      onOpenChange(false);
    }
  });

  useEffect(() => {
    if (cashier) {
      setFormData({
        firstName: cashier.firstName,
        lastName: cashier.lastName,
        contactNumber: cashier.contactNumber || "",
        isActive: cashier.isActive
      });
    }
  }, [cashier]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isActive: checked
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashier) {
      updateMutation.mutate({
        id: cashier.id,
        data: formData
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cashier</DialogTitle>
          <DialogDescription>
            Update cashier information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contactNumber">Contact Number</Label>
              <Input
                id="edit-contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              type="button" 
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
