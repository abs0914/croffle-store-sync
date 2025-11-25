
import { useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Calendar as CalendarIcon, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import InventoryHeader from "./components/InventoryHeader";
import { ProductsTable } from "./components/ProductsTable";
import { SearchFilters } from "./components/SearchFilters";
import { useProductData } from "./hooks/useProductData";
import { deleteProduct } from "@/services/product/productDelete";
import { Product } from "@/types";
import ProductForm from "./ProductForm";
import { fetchInventoryReport } from "@/services/reports/inventoryReport";
import { InventoryReportView } from "@/pages/Reports/components/reports/InventoryReportView";

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

  // Date range state for reports tab
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Fetch inventory report
  const { data: reportData, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useQuery({
    queryKey: ['inventory-report', currentStore?.id, dateRange.from, dateRange.to],
    queryFn: () => {
      if (!currentStore?.id) return null;
      return fetchInventoryReport(currentStore.id, dateRange.from, dateRange.to);
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

  const handleExportReport = () => {
    if (!reportData) {
      toast.error("No data to export");
      return;
    }
    
    const headers = ['Item Name', 'SKU', 'Initial Stock', 'Current Stock', 'Sold Units', 'Low Stock Threshold'];
    const rows = reportData.inventoryItems.map(item => [
      item.name,
      item.sku,
      item.initialStock,
      item.currentStock,
      item.soldUnits,
      item.threshold
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Report exported successfully");
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

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">
            <Package className="mr-2 h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">From:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(new Date(dateRange.from), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(dateRange.from)}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date.toISOString().split('T')[0] }))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">To:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(new Date(dateRange.to), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(dateRange.to)}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date.toISOString().split('T')[0] }))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button onClick={() => refetchReport()} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>

                <Button onClick={handleExportReport} variant="outline" disabled={!reportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {reportLoading && (
            <div className="text-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading report...</p>
            </div>
          )}

          {reportError && (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-destructive">
                  Failed to load inventory report. Please try again.
                </p>
              </CardContent>
            </Card>
          )}

          {reportData && (
            <InventoryReportView 
              data={reportData} 
              dateRange={{ 
                from: new Date(dateRange.from), 
                to: new Date(dateRange.to) 
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
