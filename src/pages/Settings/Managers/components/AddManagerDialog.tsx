
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createManager } from "@/services/manager";
import { ManagerFormData } from "@/types/manager";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
}

export default function AddManagerDialog({ isOpen, onOpenChange, stores }: AddManagerDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ManagerFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    storeIds: [],
    isActive: true
  });

  const createMutation = useMutation({
    mutationFn: createManager,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
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
      storeIds: [],
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

  const handleStoreChange = (storeId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      storeIds: checked
        ? [...prev.storeIds, storeId]
        : prev.storeIds.filter(id => id !== storeId)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.storeIds.length === 0) {
      alert("Please assign at least one store to the manager.");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Manager</DialogTitle>
          <DialogDescription>
            Add a new manager and assign them to stores.
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign to Stores</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-4 max-h-48 overflow-y-auto">
                {stores.map((store) => (
                  <div key={store.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`store-${store.id}`}
                      checked={formData.storeIds.includes(store.id)}
                      onCheckedChange={(checked) =>
                        handleStoreChange(store.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`store-${store.id}`}
                      className="text-sm font-normal"
                    >
                      {store.name}
                    </Label>
                  </div>
                ))}
              </div>
              {stores.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No stores available. Please create a store first.
                </p>
              )}
            </div>
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
              disabled={createMutation.isPending || stores.length === 0}
            >
              {createMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Add Manager
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
