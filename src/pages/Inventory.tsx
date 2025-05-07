
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { useInventory } from "@/contexts/InventoryContext";
import { Product } from "@/types";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import InventoryHeader from "@/components/inventory/InventoryHeader";
import ProductsList from "@/components/inventory/ProductsList";
import CategoriesList from "@/components/inventory/CategoriesList";
import InventoryTransactions from "@/components/inventory/InventoryTransactions";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Inventory() {
  const { hasPermission } = useAuth();
  const { currentStore } = useStore();
  const { products, categories, isLoading, error, refetchInventory } = useInventory();
  const [activeTab, setActiveTab] = useState("products");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!currentStore) return;
    
    try {
      setIsRefreshing(true);
      await refetchInventory(currentStore.id);
    } catch (err) {
      console.error("Error refreshing inventory data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Only manager and above can access this page
  if (!hasPermission('manager')) {
    return (
      <div className="container py-6">
        <h1 className="text-2xl font-bold">Permission Denied</h1>
        <p className="mt-2">You don't have permission to access inventory management.</p>
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
      <InventoryHeader />
      
      {error ? (
        <div className="bg-destructive/10 border border-destructive rounded-md p-4 mt-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-2" />
            <div>
              <h3 className="font-medium text-destructive">There was an error loading inventory data</h3>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 flex items-center"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="transactions">Inventory History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="mt-6">
            <ProductsList 
              products={products} 
              categories={categories}
              onDataChanged={handleRefresh}
            />
          </TabsContent>
          
          <TabsContent value="categories" className="mt-6">
            <CategoriesList 
              categories={categories}
              onDataChanged={handleRefresh}
            />
          </TabsContent>
          
          <TabsContent value="transactions" className="mt-6">
            <InventoryTransactions />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
