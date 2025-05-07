
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Search, 
  Edit, 
  QrCode, 
  Settings, 
  Trash, 
  Loader2 
} from "lucide-react";
import { Store } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStores(stores);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = stores.filter(store => 
        store.name.toLowerCase().includes(query) || 
        store.address.toLowerCase().includes(query) ||
        (store.email && store.email.toLowerCase().includes(query)) ||
        (store.phone && store.phone.includes(query))
      );
      setFilteredStores(filtered);
    }
  }, [searchQuery, stores]);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setStores(data as Store[] || []);
      setFilteredStores(data as Store[] || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('stores')
          .delete()
          .eq('id', storeId);

        if (error) {
          throw error;
        }

        toast.success('Store deleted successfully');
        fetchStores();
      } catch (error: any) {
        console.error('Error deleting store:', error);
        toast.error('Failed to delete store');
      }
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-croffle-primary">Store Management</h1>
        <Button
          className="bg-croffle-primary hover:bg-croffle-primary/90"
          onClick={() => navigate('/stores/new')}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Store
        </Button>
      </div>

      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search stores by name, address, email or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-lg"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-croffle-primary" />
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No stores found</p>
          {searchQuery.trim() !== "" && (
            <Button
              variant="link"
              className="mt-2 text-croffle-primary"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <Card key={store.id} className="shadow-sm hover:shadow transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{store.name}</CardTitle>
                    <CardDescription className="mt-1">{store.address}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/stores/${store.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/stores/${store.id}/settings`)}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/stores/${store.id}/qr`)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => handleDeleteStore(store.id)}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-2 pb-4">
                {store.phone && (
                  <div className="text-sm mb-1">
                    <span className="font-medium">Phone:</span> {store.phone}
                  </div>
                )}
                {store.email && (
                  <div className="text-sm mb-1">
                    <span className="font-medium">Email:</span> {store.email}
                  </div>
                )}
                {store.tax_id && (
                  <div className="text-sm mb-1">
                    <span className="font-medium">Tax ID:</span> {store.tax_id}
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium">Status:</span>
                  <span className={store.is_active ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                    {store.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/stores/${store.id}`)}
                >
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/stores/${store.id}/qr`)}
                >
                  <QrCode className="mr-1 h-4 w-4" /> Generate QR
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
