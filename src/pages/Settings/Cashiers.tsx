import { useState, useEffect } from "react";
import { useStore } from "@/contexts/StoreContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCashiers, createCashier, updateCashier, deleteCashier, createCashierWithAuth } from "@/services/cashier";
import { CashierFormData, Cashier } from "@/types/cashier";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PencilIcon, TrashIcon, PlusCircleIcon, XCircleIcon, UserPlusIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function CashiersPage() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [formData, setFormData] = useState<CashierFormData>({
    firstName: "",
    lastName: "",
    contactNumber: "",
    isActive: true
  });
  const [isCreatingDemoCashiers, setIsCreatingDemoCashiers] = useState(false);

  // Fetch cashiers for the current store
  const { data: cashiers = [], isLoading } = useQuery({
    queryKey: ["cashiers", currentStore?.id],
    queryFn: () => currentStore ? fetchCashiers(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CashierFormData) => 
      createCashier({
        store_id: currentStore!.id,
        first_name: data.firstName,
        last_name: data.lastName,
        contact_number: data.contactNumber
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers", currentStore?.id] });
      resetForm();
      setIsAddDialogOpen(false);
    }
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
      queryClient.invalidateQueries({ queryKey: ["cashiers", currentStore?.id] });
      resetForm();
      setIsEditDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCashier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashiers", currentStore?.id] });
      setIsDeleteDialogOpen(false);
      setSelectedCashier(null);
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      contactNumber: "",
      isActive: true
    });
    setSelectedCashier(null);
  };

  const handleAddCashier = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setFormData({
      firstName: cashier.firstName,
      lastName: cashier.lastName,
      contactNumber: cashier.contactNumber || "",
      isActive: cashier.isActive
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCashier) {
      updateMutation.mutate({
        id: selectedCashier.id,
        data: formData
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedCashier) {
      deleteMutation.mutate(selectedCashier.id);
    }
  };

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

  // Create demo cashiers
  const createDemoCashiers = async () => {
    if (!currentStore) return;
    
    setIsCreatingDemoCashiers(true);
    try {
      // Create the first cashier
      const maraResult = await createCashierWithAuth({
        email: 'marasabaras@croffle.com',
        password: 'M4ra$bara$',
        firstName: 'Mara',
        lastName: 'Sabaras',
        storeId: currentStore.id,
        contactNumber: '09123456789'
      });
      
      // Create the second cashier
      const robinsonResult = await createCashierWithAuth({
        email: 'robinsons.north@croffle.com',
        password: 'Rbns0nN0rt8',
        firstName: 'Robinson',
        lastName: 'North',
        storeId: currentStore.id,
        contactNumber: '09987654321'
      });
      
      if (maraResult && robinsonResult) {
        toast.success('Demo cashiers created successfully');
        queryClient.invalidateQueries({ queryKey: ["cashiers", currentStore.id] });
      }
    } catch (error: any) {
      toast.error(`Failed to create demo cashiers: ${error.message}`);
    } finally {
      setIsCreatingDemoCashiers(false);
    }
  };

  // Add an effect to automatically create the demo cashiers once when the component loads
  useEffect(() => {
    if (currentStore) {
      createDemoCashiers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore]);

  if (!currentStore) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Please select a store first</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Cashier Management</CardTitle>
          <div className="flex space-x-2">
            <Button disabled={isCreatingDemoCashiers} onClick={createDemoCashiers} variant="outline">
              {isCreatingDemoCashiers ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating Demo Cashiers...
                </>
              ) : (
                <>
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Create Demo Cashiers
                </>
              )}
            </Button>
            <Button onClick={handleAddCashier}>
              <PlusCircleIcon className="mr-2 h-4 w-4" />
              Add Cashier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : cashiers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No cashiers found for this store.</p>
              <Button onClick={handleAddCashier} variant="outline" className="mt-4">
                Add your first cashier
              </Button>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashiers.map((cashier) => (
                    <TableRow key={cashier.id}>
                      <TableCell className="font-medium">{cashier.fullName}</TableCell>
                      <TableCell>{cashier.contactNumber || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${cashier.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {cashier.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCashier(cashier)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCashier(cashier)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Cashier Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Cashier</DialogTitle>
            <DialogDescription>
              Add a new cashier to {currentStore?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd}>
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
            </div>
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => setIsAddDialogOpen(false)}
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

      {/* Edit Cashier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cashier</DialogTitle>
            <DialogDescription>
              Update cashier information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
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
                onClick={() => setIsEditDialogOpen(false)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCashier?.fullName}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
