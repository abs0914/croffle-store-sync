
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Store } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Settings, Edit, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Stores() {
  const { user, hasPermission } = useAuth();
  const { stores, setCurrentStore } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [newStore, setNewStore] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    taxId: ""
  });

  useEffect(() => {
    // Filter stores based on search query
    if (searchQuery) {
      const filtered = stores.filter(store => 
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStores(filtered);
    } else {
      setFilteredStores(stores);
    }
    setIsLoading(false);
  }, [searchQuery, stores]);

  const handleNewStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewStore(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingStore(true);

    try {
      // Insert into stores table
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: newStore.name,
          address: newStore.address,
          phone: newStore.phone,
          email: newStore.email,
          tax_id: newStore.taxId || null
        })
        .select('*')
        .single();

      if (storeError) throw storeError;

      // If user is not an admin, give them access to the store
      if (user && user.role !== 'admin') {
        const { error: accessError } = await supabase
          .from('user_store_access')
          .insert({
            user_id: user.id,
            store_id: storeData.id
          });

        if (accessError) throw accessError;
      }

      // Add to stores list and reset form
      const newStoreObj: Store = {
        id: storeData.id,
        name: storeData.name,
        address: storeData.address,
        phone: storeData.phone,
        email: storeData.email,
        taxId: storeData.tax_id || undefined,
        isActive: storeData.is_active,
        logo: storeData.logo || undefined,
      };
      
      toast.success("Store created successfully");
      setNewStore({
        name: "",
        address: "",
        phone: "",
        email: "",
        taxId: ""
      });

      // Close the dialog (assuming dialog is controlled by a useState)
      document.getElementById('close-new-store-dialog')?.click();
      
    } catch (error: any) {
      console.error("Error creating store:", error);
      toast.error(error.message || "Failed to create store");
    } finally {
      setIsCreatingStore(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;
      
      toast.success("Store deleted successfully");
    } catch (error: any) {
      console.error("Error deleting store:", error);
      toast.error(error.message || "Failed to delete store");
    }
  };

  // Only admin, owner, and manager can access this page
  if (!hasPermission('manager')) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold">Permission Denied</h1>
        <p className="mt-2">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-croffle-primary">Stores</h1>
          <p className="text-muted-foreground">Manage your store locations</p>
        </div>
        
        {hasPermission('owner') && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                New Store
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateStore}>
                <DialogHeader>
                  <DialogTitle>Create New Store</DialogTitle>
                  <DialogDescription>
                    Enter the details for your new store location
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Store Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={newStore.name}
                      onChange={handleNewStoreChange}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={newStore.email}
                        onChange={handleNewStoreChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={newStore.phone}
                        onChange={handleNewStoreChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={newStore.address}
                      onChange={handleNewStoreChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID (optional)</Label>
                    <Input
                      id="taxId"
                      name="taxId"
                      value={newStore.taxId}
                      onChange={handleNewStoreChange}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button id="close-new-store-dialog" type="button" variant="outline" className="hidden">
                    Cancel
                  </Button>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button type="submit" disabled={isCreatingStore}>
                    {isCreatingStore ? "Creating..." : "Create Store"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Stores</CardTitle>
              <CardDescription>
                View and manage all available store locations
              </CardDescription>
            </div>
            
            <Input
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredStores.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No stores found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery ? "Try changing your search query" : hasPermission('owner') ? "Get started by creating a new store" : "You don't have access to any stores"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.address}</TableCell>
                    <TableCell>
                      <div>{store.phone}</div>
                      <div className="text-muted-foreground text-sm">{store.email}</div>
                    </TableCell>
                    <TableCell>
                      {store.isActive ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          asChild
                        >
                          <Link to={`/stores/${store.id}`}>
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Settings</span>
                          </Link>
                        </Button>
                        
                        {hasPermission('owner') && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the store
                                  and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteStore(store.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
