
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types";
import { InventoryHeader } from "./components/InventoryHeader";
import { ProductsTable } from "./components/ProductsTable";
import { SearchFilters } from "./components/SearchFilters";
import { useInventoryData } from "./hooks/useInventoryData";

export default function Inventory() {
  const navigate = useNavigate();
  const {
    currentStore,
    products,
    categories,
    isLoading,
    activeCategory,
    setActiveCategory,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
  } = useInventoryData();

  const handleEdit = (product: Product) => {
    navigate(`/inventory/product/${product.id}`);
  };

  const handleView = (product: Product) => {
    navigate(`/inventory/product/${product.id}`);
  };

  const handleDelete = (product: Product) => {
    // Handle product deletion
    console.log('Delete product:', product.id);
  };

  const handleStockAdjust = (product: Product) => {
    // Handle stock adjustment
    console.log('Adjust stock for product:', product.id);
  };

  const handleAddProduct = () => {
    navigate('/inventory/product/new');
  };

  if (!currentStore) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Please select a store to manage inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryHeader 
        onAddProduct={handleAddProduct}
        storeId={currentStore.id}
        storeName={currentStore.name}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SearchFilters
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  categories={categories}
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {filteredProducts.length} products
                    </span>
                    {activeCategory !== 'all' && (
                      <Badge variant="secondary">
                        {categories.find(c => c.id === activeCategory)?.name || 'Unknown'}
                      </Badge>
                    )}
                  </div>
                  <Button onClick={handleAddProduct}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </div>

                <ProductsTable
                  products={filteredProducts}
                  onEdit={handleEdit}
                  onView={handleView}
                  onDelete={handleDelete}
                  onStockAdjust={handleStockAdjust}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Categories management coming soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingredients" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Ingredients management coming soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Stock management coming soon!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
