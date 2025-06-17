
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Package
} from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProductCatalog, toggleProductAvailability, deleteProduct } from '@/services/productCatalog/productCatalogService';
import { ProductCatalog } from '@/services/productCatalog/types';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddProductDialog } from './components/AddProductDialog';
import { EditProductDialog } from './components/EditProductDialog';
import { BulkOperations } from './components/BulkOperations';

export const ProductCatalogManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductCatalog | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductCatalog | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Get user's first store for now (can be enhanced for multi-store)
  const storeId = user?.storeIds?.[0] || '';

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['product-catalog', storeId],
    queryFn: () => fetchProductCatalog(storeId),
    enabled: !!storeId,
  });

  // Clear selections when products change
  useEffect(() => {
    setSelectedProducts([]);
  }, [products]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showAvailableOnly || product.is_available;
    return matchesSearch && matchesAvailability;
  });

  const handleToggleAvailability = async (product: ProductCatalog) => {
    const success = await toggleProductAvailability(product.id, !product.is_available);
    if (success) {
      refetch();
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    const success = await deleteProduct(productToDelete.id);
    if (success) {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      refetch();
    }
  };

  const handleEditProduct = (product: ProductCatalog) => {
    setProductToEdit(product);
    setEditDialogOpen(true);
  };

  const handleProductSelection = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleRefetch = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['product-catalog'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">Manage your store's product offerings</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showAvailableOnly ? "default" : "outline"}
              onClick={() => setShowAvailableOnly(!showAvailableOnly)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Available Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {products.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <BulkOperations
              products={filteredProducts}
              selectedProducts={selectedProducts}
              onSelectionChange={setSelectedProducts}
              onProductsUpdated={handleRefetch}
            />
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={(checked) => 
                      handleProductSelection(product.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {product.product_name}
                    </CardTitle>
                    <Badge 
                      variant={product.is_available ? "default" : "secondary"}
                      className="mt-2"
                    >
                      {product.is_available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">₱{product.price.toFixed(2)}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleAvailability(product)}
                  >
                    {product.is_available ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setProductToDelete(product);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {product.ingredients && product.ingredients.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    {product.ingredients.length} ingredient{product.ingredients.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start by adding your first product to the catalog.'}
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.product_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Product Dialog */}
      <AddProductDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onProductAdded={handleRefetch}
      />

      {/* Edit Product Dialog */}
      <EditProductDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onProductUpdated={handleRefetch}
        product={productToEdit}
      />
    </div>
  );
};
