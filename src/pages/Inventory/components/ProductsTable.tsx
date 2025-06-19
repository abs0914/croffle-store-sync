import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/format";
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

interface ProductsTableProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onDelete: (product: Product) => void;
  onStockAdjust?: (product: Product) => void;
}

export const ProductsTable = ({ 
  products, 
  isLoading, 
  onEdit, 
  onView,
  onDelete,
  onStockAdjust 
}: ProductsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort products based on the current sort configuration
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: keyof Product) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteProduct) {
      onDelete(deleteProduct);
      setDeleteProduct(null);
    }
  };

  const getCategoryName = (category: Product['category']) => {
    if (!category) return 'No Category';
    return typeof category === 'string' ? category : category.name;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>No products found. Add your first product to get started.</p>
      </div>
    );
  }

  const getSortIcon = (key: keyof Product) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>
      
      <Table>
        <TableCaption>List of store products</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('name')}
            >
              Product Name {getSortIcon('name')}
            </TableHead>
            <TableHead>SKU</TableHead>
            <TableHead 
              className="text-right cursor-pointer"
              onClick={() => handleSort('price')}
            >
              Price {getSortIcon('price')}
            </TableHead>
            <TableHead 
              className="text-right cursor-pointer"
              onClick={() => handleSort('stock_quantity')}
            >
              Stock {getSortIcon('stock_quantity')}
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead 
              className="cursor-pointer"
              onClick={() => handleSort('updated_at')}
            >
              Last Updated {getSortIcon('updated_at')}
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProducts.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{product.sku}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(product.price)}
              </TableCell>
              <TableCell className="text-right">
                <span className={`font-medium ${(product.stock_quantity || product.stockQuantity || 0) <= 10 ? 'text-destructive' : ''}`}>
                  {product.stock_quantity || product.stockQuantity || 0}
                </span>
              </TableCell>
              <TableCell>
                {getCategoryName(product.category)}
              </TableCell>
              <TableCell>
                {(product.is_active || product.isActive) ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
              </TableCell>
              <TableCell>
                {product.updated_at ? format(new Date(product.updated_at), 'MMM dd, yyyy') : 'N/A'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={() => onView(product)}
                    title="View Product"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="outline"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem onClick={() => onEdit(product)}>
                        Edit Product
                      </DropdownMenuItem>
                      
                      {onStockAdjust && (
                        <DropdownMenuItem onClick={() => onStockAdjust(product)}>
                          Adjust Stock
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onClick={() => setDeleteProduct(product)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Product
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProduct?.name}"? This action cannot be undone and will remove all associated data including stock records and transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
