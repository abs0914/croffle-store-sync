
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function CreateStoreDialog() {
  const { user } = useAuth();
  const { refetchStores } = useStore();
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [newStore, setNewStore] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    taxId: ""
  });

  const handleNewStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewStore(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingStore(true);

    try {
      console.log("Creating store:", newStore);
      
      // Insert into stores table using the improved RLS policy
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: newStore.name,
          address: newStore.address,
          phone: newStore.phone,
          email: newStore.email,
          tax_id: newStore.taxId || null,
          is_active: true
        })
        .select('*')
        .single()
        .throwOnError();

      if (storeError) {
        console.error("Error creating store in database:", storeError);
        throw storeError;
      }
      
      console.log("Store created successfully:", storeData);

      // If user is not an admin, give them access to the store
      if (user && user.role !== 'admin') {
        console.log("Creating user store access for:", user.id, storeData.id);
        const { error: accessError } = await supabase
          .from('user_store_access')
          .insert({
            user_id: user.id,
            store_id: storeData.id
          })
          .throwOnError();

        if (accessError) {
          console.error("Error creating store access:", accessError);
          throw accessError;
        }
        
        console.log("User store access created successfully");
      }
      
      toast.success("Store created successfully");
      setNewStore({
        name: "",
        address: "",
        phone: "",
        email: "",
        taxId: ""
      });

      // Close the dialog
      setIsOpen(false);
      
      // Refresh store list using the new refetchStores function
      await refetchStores();
      
    } catch (error: any) {
      console.error("Error creating store:", error);
      toast.error(error.message || "Failed to create store");
    } finally {
      setIsCreatingStore(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingStore}>
              {isCreatingStore ? "Creating..." : "Create Store"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
