import { triggerPriceRefresh } from '@/utils/triggerPriceRefresh';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Package, 
  Eye, 
  EyeOff, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit3,
  Pen,
  Filter
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { fetchProductCatalog, updateProduct } from '@/services/productCatalog/productCatalogService';
import { ProductCatalog } from '@/services/productCatalog/types';
import { EditProductDialog } from '@/pages/ProductCatalog/components/EditProductDialog';
import { EnhancedProductListView } from './EnhancedProductListView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useOptimizedDataFetch, useOptimizedMutation } from '@/hooks/useOptimizedDataFetch';
import { useQueryClient } from '@tanstack/react-query';
import { fetchCategories } from '@/services/category/categoryFetch';
import { Category } from '@/types';

interface StoreCatalogTabProps {
  storeId: string;
}

export function StoreCatalogTab({ storeId }: StoreCatalogTabProps) {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  // Removed viewMode state - using Enhanced List View only
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<ProductCatalog | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalog | null>(null);
  
  const canEditPrices = hasPermission('admin') || hasPermission('owner') || hasPermission('manager');

  // Optimized data fetching with React Query
  const {
    data: products = [],
    isLoading: loading,
    error: productsError
  } = useOptimizedDataFetch<ProductCatalog[]>(
    ['product-catalog', storeId],
    () => fetchProductCatalog(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 30 * 1000, // 30 seconds for fresh data
        cacheTime: 2 * 60 * 1000, // 2 minutes
      }
    }
  );

  // Fetch categories for filtering
  const {
    data: categories = [],
    isLoading: categoriesLoading
  } = useOptimizedDataFetch<Category[]>(
    ['categories', storeId],
    () => fetchCategories(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 5 * 60 * 1000, // 5 minutes for categories
        cacheTime: 10 * 60 * 1000, // 10 minutes
      }
    }
  );

  // Real-time subscription for product updates
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'product_catalog',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          // Invalidate cache when products are updated
          queryClient.invalidateQueries({ queryKey: ['product-catalog', storeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  // Optimized mutation for toggling product availability
  const { mutate: toggleAvailability } = useOptimizedMutation(
    async ({ productId, newStatus }: { productId: string; newStatus: boolean }) => {
      const result = await updateProduct(productId, { is_available: newStatus });
      if (!result) throw new Error('Failed to toggle product availability');
      return result;
    },
    {
      onSuccess: () => {
        toast.success('Product availability updated successfully');
      },
      onError: (error) => {
        console.error('Error toggling product availability:', error);
        toast.error('Failed to update product availability');
      },
      invalidateQueries: [['product-catalog', storeId]]
    }
  );

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    toggleAvailability({ productId, newStatus: !currentStatus });
  };

  const handleEditPrice = (product: ProductCatalog) => {
    setEditingProduct(product);
    setEditPrice(product.price?.toString() || '0');
  };

  const handleEditProduct = (product: ProductCatalog) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setSelectedProduct(null);
  };

  const handleProductUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['product-catalog', storeId] });
    handleEditDialogClose();
  };

  // Optimized mutation for updating product price
  const { mutate: updatePrice } = useOptimizedMutation(
    async ({ productId, newPrice }: { productId: string; newPrice: number }) => {
      const result = await updateProduct(productId, { price: newPrice });
      if (!result) throw new Error('Failed to update price');
      return result;
    },
    {
      onSuccess: async () => {
        setEditingProduct(null);
        toast.success('Price updated successfully - POS systems notified');
        
        // Trigger immediate price refresh for POS systems
        triggerPriceRefresh();
      },
      onError: (error) => {
        console.error('Error updating price:', error);
        toast.error('Failed to update price');
      },
      invalidateQueries: [['product-catalog', storeId]]
    }
  );

  const handleSavePrice = async () => {
    if (!editingProduct) return;
    
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    updatePrice({ productId: editingProduct.id, newPrice });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showUnavailableOnly || !product.is_available;
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesAvailability && matchesCategory;
  });

  const getAvailabilityIcon = (isAvailable: boolean) => {
    return isAvailable ?
      <CheckCircle className="h-4 w-4 text-green-600" /> :
      <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  // Helper function to get category name
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  // Convert ProductCatalog to the format expected by EditProductDialog
  const convertToProductCatalog = (product: ProductCatalog) => {
    return {
      ...product,
      name: product.product_name, // Map product_name to name for compatibility
      is_active: product.is_available // Map is_available to is_active for compatibility
    };
  };

  const availableCount = products.filter(p => p.is_available).length;
  const lowStockCount = 0; // Not applicable for product catalog
  const unavailableCount = products.filter(p => !p.is_available).length;
  const avgPrice = products.length > 0 
    ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product Catalog - Enhanced View Only */}
      <EnhancedProductListView storeId={storeId} />

      {/* Price Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="product-name">Product</Label>
              <Input
                id="product-name"
                value={editingProduct?.product_name || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₱)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button onClick={handleSavePrice}>
                Save Price
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Edit Dialog */}
      {selectedProduct && (
        <EditProductDialog
          isOpen={showEditDialog}
          onClose={handleEditDialogClose}
          onProductUpdated={handleProductUpdated}
          product={convertToProductCatalog(selectedProduct)}
        />
      )}
    </div>
  );
}