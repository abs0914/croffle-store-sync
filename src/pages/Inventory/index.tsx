
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ChefHat, BarChart3, Plus, Warehouse, RefreshCw } from "lucide-react";
import ProductForm from "./ProductForm";
import InventoryStock from "./InventoryStock";
import Categories from "./Categories";
import Ingredients from "./Ingredients";
import InventoryHistory from "./InventoryHistory";
import InventoryManagement from "./InventoryManagement";
import { useAuth } from "@/contexts/auth";

export default function Inventory() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("management");

  const hasAdminAccess = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Menu & Inventory Management</h1>
        <p className="text-muted-foreground">
          Manage your products, store inventory, recipes and menu items
        </p>
        {hasAdminAccess && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Admin Access:</strong> You can also manage commissary inventory and conversions from the main navigation.
            </p>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Recipes & Menu
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Store Inventory
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Ingredients
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management">
          <InventoryManagement />
        </TabsContent>

        <TabsContent value="products">
          <ProductForm />
        </TabsContent>

        <TabsContent value="stock">
          <InventoryStock />
        </TabsContent>

        <TabsContent value="categories">
          <Categories />
        </TabsContent>

        <TabsContent value="ingredients">
          <Ingredients />
        </TabsContent>

        <TabsContent value="history">
          <InventoryHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
