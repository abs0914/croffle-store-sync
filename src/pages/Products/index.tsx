import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Wand2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import ProductInventory from './ProductInventory';
import { ProductManagementEnhanced } from './ProductManagementEnhanced';

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('standard');

  if (!user?.storeIds?.[0]) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No Store Access</p>
              <p className="text-muted-foreground">Please contact your administrator to get access to a store</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const storeId = user.storeIds[0];

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <div className="border-b">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Product Management</h1>
                <p className="text-muted-foreground">
                  Manage your products, recipes, and inventory
                </p>
              </div>
            </div>
            
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="standard" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Standard View
              </TabsTrigger>
              <TabsTrigger value="enhanced" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Enhanced Recipe Management
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="standard" className="m-0">
          <ProductInventory />
        </TabsContent>

        <TabsContent value="enhanced" className="m-0">
          <ProductManagementEnhanced storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductsPage;