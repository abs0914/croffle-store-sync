
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateManager } from "@/services/manager";
import { Manager, ManagerFormData } from "@/types/manager";
import { Store } from "@/types/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditManagerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  manager: Manager | null;
  stores: Store[];
}

export default function EditManagerDialog({ isOpen, onOpenChange, manager, stores }: EditManagerDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ManagerFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    email: "",
    storeIds: [],
    isActive: true
  });

  useEffect(() => {
    if (manager) {
      const [firstName, lastName] = manager.fullName.split(' ');
      setFormData({
        firstName: firstName || "",
        lastName: lastName || "",
        contactNumber: manager.contactNumber || "",
        email: manager.email || "",
        storeIds: manager.storeIds || [],
        isActive: manager.isActive
      });
    }
  }, [manager]);

  const updateMutation = useMutation({
    mutationFn: (data: ManagerFormData & { id: string }) => updateManager(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      onOpenChange(false);
    }
  });

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

  const handleActiveChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isActive: checked
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manager) return;

    if (formData.storeIds.length === 0) {
      alert("Please assign at least one store to the manager.");
      return;
    }

    updateMutation.mutate({
      id: manager.id,
      ...formData
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Manager</DialogTitle>
          <DialogDescription>
            Update manager details and store assignments.
          </DialogDescription>
        </DialogHeader>
        {manager && (
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
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={handleActiveChange}
                />
                <Label htmlFor="active">Active</Label>
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
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
