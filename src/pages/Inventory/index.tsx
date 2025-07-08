
import { useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import InventoryHeader from "./components/InventoryHeader";
import { ProductsTable } from "./components/ProductsTable";
import { SearchFilters } from "./components/SearchFilters";
import { InventoryDebugPanel } from "./components/InventoryDebugPanel";
import { useProductData } from "./hooks/useProductData";
import { deleteProduct } from "@/services/product/productDelete";
import { Product } from "@/types";
import ProductForm from "./ProductForm";

export default function Inventory() {
  return (
    <Routes>
      <Route path="/" element={<InventoryMain />} />
      <Route path="/product/new" element={<ProductForm />} />
      <Route path="/product/:id" element={<ProductForm />} />
    </Routes>
  );
}

function InventoryMain() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    currentStore,
    products, 
    categories, 
    filteredProducts,
    isLoading,
    searchTerm,
    setSearchTerm,
    activeCategory,
    setActiveCategory,
    activeTab,
    setActiveTab,
    error
  } = useProductData();

  console.log("=== INVENTORY DEBUG ===");
  console.log("Current Store:", {
    id: currentStore?.id,
    name: currentStore?.name,
    exists: !!currentStore
  });
  console.log("Data State:", {
    isLoading,
    productsCount: products?.length || 0,
    filteredCount: filteredProducts?.length || 0,
    categoriesCount: categories?.length || 0,
    hasError: !!error,
    errorMessage: error?.message
  });
  console.log("Filter State:", {
    searchTerm,
    activeCategory,
    activeTab
  });
  console.log("======================");

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', currentStore?.id] });
      toast.success("Product deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  });

  const handleAddItem = () => {
    navigate("/inventory/product/new");
  };

  const handleEditProduct = (product: Product) => {
    navigate(`/inventory/product/${product.id}`);
  };

  const handleViewProduct = (product: Product) => {
    navigate(`/inventory/product/${product.id}`);
  };

  const handleDeleteProduct = (product: Product) => {
    if (!product.id) {
      toast.error("Cannot delete product: invalid product ID");
      return;
    }
    deleteProductMutation.mutate(product.id);
  };

  const handleStockAdjustment = (product: Product) => {
    // This would open a stock adjustment modal
    // For now, navigate to edit page where stock can be adjusted
    navigate(`/inventory/product/${product.id}`);
  };

  const handleStockUpdated = () => {
    // Refresh the products data after stock update
    queryClient.invalidateQueries({ queryKey: ['products', currentStore?.id] });
  };

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <InventoryHeader
          title="Store Inventory Management"
          description="Manage your store's product catalog and stock levels for customer orders and sales."
          onAddItem={handleAddItem}
          showAddButton={false}
        />
        <div className="mt-8 text-center p-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No Store Selected</h3>
          <p className="text-muted-foreground mb-4">
            Please select a store from the sidebar to view and manage its inventory.
          </p>
          <div className="text-sm text-muted-foreground">
            <p>• Use the store selector in the sidebar</p>
            <p>• Make sure you have access to at least one store</p>
            <p>• Contact your administrator if you need store access</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <InventoryHeader
          title="Store Inventory Management"
          description="Manage your store's product catalog and stock levels for customer orders and sales."
          onAddItem={handleAddItem}
          showAddButton={false}
        />
        <div className="text-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryHeader
        title="Store Inventory Management"
        description="Manage your store's product catalog and stock levels for customer orders and sales."
        onAddItem={handleAddItem}
        showAddButton={true}
      />

      <InventoryDebugPanel />

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Store-Level Products</h3>
        <p className="text-sm text-blue-700">
          Manage menu items and finished products available for sale in your store. This includes items that customers can purchase directly through your POS system.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <h3 className="font-semibold text-destructive mb-2">Error Loading Inventory</h3>
          <p className="text-sm text-destructive/80 mb-3">{error.message}</p>
          <div className="text-xs text-muted-foreground">
            <p>Common solutions:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Check your internet connection</li>
              <li>Verify you have permission to access this store</li>
              <li>Try refreshing the page</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <Card>
        <CardContent className="p-4">
          <ProductsTable 
            products={filteredProducts}
            isLoading={isLoading}
            onEdit={handleEditProduct}
            onView={handleViewProduct}
            onDelete={handleDeleteProduct}
            onStockAdjust={handleStockAdjustment}
            onStockUpdated={handleStockUpdated}
          />
        </CardContent>
      </Card>
    </div>
  );
}
