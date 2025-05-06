
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Store } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import QRCode from "@/components/store/QRCode";
import { Building2, Receipt, QrCode, Users } from "lucide-react";
import StoreDetailsForm from "@/components/store/StoreDetailsForm";
import StoreReceiptSettings from "@/components/store/StoreReceiptSettings";
import StoreUserAccess from "@/components/store/StoreUserAccess";

export default function StoreSettings() {
  const { storeId } = useParams<{ storeId: string }>();
  const { user, hasPermission } = useAuth();
  const { stores } = useStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);

  useEffect(() => {
    const fetchStoreDetails = async () => {
      setIsLoading(true);
      try {
        if (!storeId) {
          throw new Error("No store ID provided");
        }

        // Check if user has access to this store
        if (!user) {
          navigate("/login");
          return;
        }

        // If it's not an admin and doesn't have access to this store, redirect
        if (user.role !== 'admin' && !user.storeIds.includes(storeId)) {
          toast.error("You don't have access to this store");
          navigate("/");
          return;
        }

        // Try to get the store from the context first
        const contextStore = stores.find(s => s.id === storeId);
        if (contextStore) {
          setCurrentStore(contextStore);
          setIsLoading(false);
          return;
        }

        // If not in context, fetch from the database
        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Store not found");
        }

        // Map to our Store type
        const mappedStore: Store = {
          id: data.id,
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          taxId: data.tax_id || undefined,
          isActive: data.is_active,
          logo: data.logo || undefined,
        };

        setCurrentStore(mappedStore);
      } catch (error: any) {
        console.error("Error fetching store:", error);
        toast.error(error.message || "Failed to load store details");
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreDetails();
  }, [storeId, navigate, user, stores]);

  // Only allow owners, managers and admins to access this page
  if (!hasPermission('manager')) {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Store Not Found</h1>
        <p>The store you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-croffle-primary">{currentStore.name}</h1>
        <p className="text-muted-foreground">Manage store settings and configuration</p>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details" className="flex items-center">
            <Building2 className="mr-2 h-4 w-4" />
            Store Details
          </TabsTrigger>
          <TabsTrigger value="receipt" className="flex items-center">
            <Receipt className="mr-2 h-4 w-4" />
            Receipt Settings
          </TabsTrigger>
          {hasPermission('owner') && (
            <TabsTrigger value="users" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              User Access
            </TabsTrigger>
          )}
          <TabsTrigger value="qrcode" className="flex items-center">
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <StoreDetailsForm store={currentStore} />
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
          <StoreReceiptSettings storeId={currentStore.id} />
        </TabsContent>

        {hasPermission('owner') && (
          <TabsContent value="users" className="space-y-4">
            <StoreUserAccess storeId={currentStore.id} />
          </TabsContent>
        )}

        <TabsContent value="qrcode" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Store QR Code</CardTitle>
              <CardDescription>
                Generate a QR code for customers to easily access your store information
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <QRCode storeId={currentStore.id} storeName={currentStore.name} />
              <p className="text-sm text-muted-foreground mt-4">
                Customers can scan this code to access store information, promotions, or digital menus
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
