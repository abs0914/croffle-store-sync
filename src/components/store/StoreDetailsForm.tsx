
import { useState } from "react";
import { Store } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface StoreDetailsFormProps {
  store: Store;
}

export default function StoreDetailsForm({ store }: StoreDetailsFormProps) {
  const navigate = useNavigate();
  const { stores, setCurrentStore } = useStore();
  const [formData, setFormData] = useState({
    name: store.name,
    address: store.address,
    phone: store.phone,
    email: store.email,
    taxId: store.taxId || "",
    isActive: store.isActive
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          tax_id: formData.taxId || null,
          is_active: formData.isActive
        })
        .eq('id', store.id);

      if (error) throw error;

      // Update the store in context if needed
      const updatedStore: Store = {
        ...store,
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        taxId: formData.taxId || undefined,
        isActive: formData.isActive
      };

      // Find the store in the stores array and update it
      const updatedStores = stores.map(s => 
        s.id === store.id ? updatedStore : s
      );

      // Update the current store in the context
      setCurrentStore(updatedStore);
      
      toast.success("Store details updated successfully");
    } catch (error: any) {
      console.error("Error updating store:", error);
      toast.error(error.message || "Failed to update store details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>
            Update your store's business information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID (Optional)</Label>
              <Input
                id="taxId"
                name="taxId"
                value={formData.taxId}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="isActive">Store is active</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
