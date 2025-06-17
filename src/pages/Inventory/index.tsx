
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InventoryHeader from './components/InventoryHeader';
import { SearchFilters } from './components/SearchFilters';
import { ProductsTable } from './components/ProductsTable';
import { useStore } from '@/contexts/StoreContext';
import { useProductData } from '@/hooks/useProductData';
import { Card, CardContent } from '@/components/ui/card';

export default function InventoryPage() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all');

  const {
    filteredProducts,
    isLoading,
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate
  } = useProductData(currentStore?.id || null);

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a store to manage inventory.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter products based on search term and active tab
  const finalFilteredProducts = filteredProducts.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = filterTab === 'all' || 
      (filterTab === 'active' && (product.is_active || product.isActive)) ||
      (filterTab === 'inactive' && !(product.is_active || product.isActive)) ||
      (filterTab === 'low-stock' && (product.stock_quantity || product.stockQuantity || 0) <= 10);
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground">
          Manage products and track inventory for {currentStore.name}
        </p>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Inventory Overview</h3>
        <p className="text-sm text-blue-700">
          This section focuses on product inventory and stock management. 
          Recipe management has been moved to the <strong>Admin panel</strong> for centralized control.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="products">Products & Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <InventoryHeader
            title="Products & Stock Management"
            description="Manage your store's product inventory"
            onExportCSV={handleExportCSV}
            onImportClick={handleImportClick}
            onDownloadTemplate={handleDownloadTemplate}
          />
          <SearchFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeTab={filterTab}
            setActiveTab={setFilterTab}
          />
          <ProductsTable 
            products={finalFilteredProducts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
