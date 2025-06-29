
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConversionMappingManager } from '@/components/inventory/ConversionMappingManager';
import { useAuthContext } from '@/contexts/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface Store {
  id: string;
  name: string;
}

const InventoryConversion: React.FC = () => {
  const { user } = useAuthContext();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, [user]);

  const loadStores = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get user's accessible stores
      const { data: userProfile } = await supabase
        .from('app_users')
        .select('store_ids, role')
        .eq('user_id', user.id)
        .single();

      let storeQuery = supabase.from('stores').select('id, name').eq('is_active', true);
      
      if (userProfile?.role !== 'admin' && userProfile?.role !== 'owner') {
        // Non-admin users can only see their assigned stores
        if (userProfile?.store_ids && userProfile.store_ids.length > 0) {
          storeQuery = storeQuery.in('id', userProfile.store_ids);
        } else {
          setStores([]);
          setIsLoading(false);
          return;
        }
      }

      const { data: storesData, error } = await storeQuery.order('name');
      
      if (error) throw error;
      
      setStores(storesData || []);
      if (storesData && storesData.length > 0 && !selectedStoreId) {
        setSelectedStoreId(storesData[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Store Access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have access to any stores. Please contact an administrator to assign you to a store.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inventory Conversion Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage conversion mappings between bulk inventory items and recipe ingredients
        </p>
      </div>

      <Tabs defaultValue="mappings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mappings">Conversion Mappings</TabsTrigger>
          <TabsTrigger value="preview">Preview & Test</TabsTrigger>
        </TabsList>

        <TabsContent value="mappings" className="space-y-6">
          {stores.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Store Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => setSelectedStoreId(store.id)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        selectedStoreId === store.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <h3 className="font-medium">{store.name}</h3>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedStoreId && (
            <ConversionMappingManager storeId={selectedStoreId} />
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Preview & Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature will allow you to preview how recipe ingredients will be converted 
                and test inventory deductions before applying them in the POS system.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Coming soon in the next phase of implementation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryConversion;
