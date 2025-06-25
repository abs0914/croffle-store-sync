
import React from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Eye, Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { StockAdjustmentModal } from './product/StockAdjustmentModal';
import { ProductDeleteDialog } from './product/ProductDeleteDialog';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onDelete: (product: Product) => void;
  onStockAdjust: (product: Product) => void;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  onEdit,
  onView,
  onDelete,
  onStockAdjust,
}) => {
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleStockAdjust = (product: Product) => {
    setSelectedProduct(product);
    setIsStockModalOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const handleStockAdjustmentSuccess = () => {
    setIsStockModalOpen(false);
    setSelectedProduct(null);
    // Refresh products list
    window.location.reload();
  };

  const handleDeleteSuccess = () => {
    setIsDeleteDialogOpen(false);
    setSelectedProduct(null);
    onDelete(selectedProduct!);
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No products found</h3>
            <p className="text-sm text-muted-foreground">
              Create your first product to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.description}
                    </p>
                  )}
                </div>
                <Badge variant={product.is_active ? 'default' : 'secondary'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            
            {product.image_url && (
              <div className="px-6 pb-3">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}
            
            <CardContent className="pt-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm">Price</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Stock</span>
                  <span className="text-sm">
                    {product.stock_quantity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">SKU</span>
                  <span className="text-sm">{product.sku}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(product)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(product)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStockAdjust(product)}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(product)}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <StockAdjustmentModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        product={selectedProduct}
        onAdjust={async (productId: string, adjustment: number, reason: string) => {
          // Handle stock adjustment
          handleStockAdjustmentSuccess();
        }}
      />

      <ProductDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        product={selectedProduct}
        onConfirm={async (productId: string) => {
          // Handle product deletion
          handleDeleteSuccess();
        }}
      />
    </>
  );
};

export default ProductsTable;
