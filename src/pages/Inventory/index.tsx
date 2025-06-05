
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ChefHat, BarChart3, Plus } from "lucide-react";
import ProductForm from "./ProductForm";
import InventoryStock from "./InventoryStock";
import Categories from "./Categories";
import Ingredients from "./Ingredients";
import InventoryHistory from "./InventoryHistory";
import InventoryManagement from "./InventoryManagement";

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("management");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Inventory</h1>
        <p className="text-muted-foreground">
          Manage your products, stock, recipes and inventory items
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Management
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
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
