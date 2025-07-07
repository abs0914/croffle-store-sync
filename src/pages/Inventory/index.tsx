
import { useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import InventoryHeader from "./components/InventoryHeader";
import { ProductsTable } from "./components/ProductsTable";
import { SearchFilters } from "./components/SearchFilters";
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

  console.log("Inventory Debug:", { 
    currentStore: currentStore?.id, 
    totalProducts: products?.length, 
    filteredProducts: filteredProducts?.length, 
    isLoading,
    error 
  });

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
        <h1 className="text-2xl font-bold mb-4">Store Inventory Management</h1>
        <p>Please select a store first</p>
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

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Store-Level Products</h3>
        <p className="text-sm text-blue-700">
          Manage menu items and finished products available for sale in your store. This includes items that customers can purchase directly through your POS system.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-800 mb-2">Error Loading Inventory</h3>
          <p className="text-sm text-red-700">{error.message}</p>
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
