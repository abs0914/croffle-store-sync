
import { useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileText, TrendingDown, AlertTriangle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import InventoryHeader from "./components/InventoryHeader";
import { ProductsTable } from "./components/ProductsTable";
import { SearchFilters } from "./components/SearchFilters";
import { useProductData } from "./hooks/useProductData";
import { deleteProduct } from "@/services/product/productDelete";
import { Product } from "@/types";
import ProductForm from "./ProductForm";
import { fetchInventoryReport } from "@/services/reports/inventoryReport";

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

  // Fetch inventory report for quick stats
  const { data: inventoryReport } = useQuery({
    queryKey: ['inventory-quick-report', currentStore?.id],
    queryFn: () => {
      if (!currentStore?.id) return null;
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return fetchInventoryReport(currentStore.id, thirtyDaysAgo, today);
    },
    enabled: !!currentStore?.id,
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
    navigate(`/inventory/product/${product.id}`);
  };

  const handleStockUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['products', currentStore?.id] });
  };

  if (!currentStore) {
    return (
      <div className="container mx-auto p-4">
        <InventoryHeader
          title="Store Product Management"
          description="Manage your store's product catalog and stock levels for customer orders and sales."
          onAddItem={handleAddItem}
          showAddButton={false}
        />
        <div className="mt-8 text-center p-12 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25">
          <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No Store Selected</h3>
          <p className="text-muted-foreground mb-4">
            Please select a store from the sidebar to view and manage its products.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <InventoryHeader
          title="Store Product Management"
          description="Manage your store's product catalog and stock levels for customer orders and sales."
          onAddItem={handleAddItem}
          showAddButton={false}
        />
        <div className="text-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InventoryHeader
        title="Store Product Management"
        description="Manage your store's product catalog and stock levels for customer orders and sales."
        onAddItem={handleAddItem}
        showAddButton={true}
      />

      {/* Quick Inventory Report Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryReport?.totalItems || products.length}</div>
            <p className="text-xs text-muted-foreground">Active products in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{inventoryReport?.lowStockItems || 0}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{inventoryReport?.outOfStockItems || 0}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">View Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/admin/inventory/reports')}
              className="w-full"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Full Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Store-Level Products</h3>
        <p className="text-sm text-blue-700">
          Manage menu items and finished products available for sale in your store. This includes items that customers can purchase directly through your POS system.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
          <h3 className="font-semibold text-destructive mb-2">Error Loading Products</h3>
          <p className="text-sm text-destructive/80 mb-3">{error.message}</p>
        </div>
      )}

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
