
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import InventoryHeader from "./components/InventoryHeader";
import { ProductsTable } from "./components/ProductsTable";
import { SearchFilters } from "./components/SearchFilters";
import { useProductData } from "./hooks/useProductData";
import { deleteProduct } from "@/services/product";
import { Product } from "@/types";

export default function Inventory() {
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
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate
  } = useProductData();

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

  const handleNavigationTabChange = (value: string) => {
    if (value === "stock") {
      navigate("/inventory/stock");
    }
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
        description="Manage your store's product catalog and stock levels"
        onExportCSV={handleExportCSV}
        onImportClick={handleImportClick}
        onDownloadTemplate={handleDownloadTemplate}
      />

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Store-Level Products</h3>
        <p className="text-sm text-blue-700">
          Manage menu items and finished products available for sale in your store.
          This includes items that customers can purchase directly through your POS system.
        </p>
      </div>
      
      <Tabs defaultValue="menu" value="menu" onValueChange={handleNavigationTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="menu" className="flex-1 py-2">Menu Management</TabsTrigger>
          <TabsTrigger value="stock" className="flex-1 py-2">Inventory Stock</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button
          onClick={() => navigate("/inventory/product/new")}
          className="bg-croffle-accent hover:bg-croffle-accent/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
