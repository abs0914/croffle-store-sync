
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ChevronDown, Eye, EyeOff, Trash2 } from 'lucide-react';
import { ProductCatalog } from '@/services/productCatalog/types';
import { updateProduct, deleteProduct } from '@/services/productCatalog/productCatalogService';
import { toast } from 'sonner';

interface BulkOperationsProps {
  products: ProductCatalog[];
  selectedProducts: string[];
  onSelectionChange: (productIds: string[]) => void;
  onProductsUpdated: () => void;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  products,
  selectedProducts,
  onSelectionChange,
  onProductsUpdated
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map(p => p.id));
    }
  };

  const handleBulkEnable = async () => {
    setIsProcessing(true);
    try {
      const promises = selectedProducts.map(id => 
        updateProduct(id, { is_available: true })
      );
      
      await Promise.all(promises);
      toast.success(`${selectedProducts.length} products enabled`);
      onProductsUpdated();
      onSelectionChange([]);
    } catch (error) {
      toast.error('Failed to enable products');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDisable = async () => {
    setIsProcessing(true);
    try {
      const promises = selectedProducts.map(id => 
        updateProduct(id, { is_available: false })
      );
      
      await Promise.all(promises);
      toast.success(`${selectedProducts.length} products disabled`);
      onProductsUpdated();
      onSelectionChange([]);
    } catch (error) {
      toast.error('Failed to disable products');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const promises = selectedProducts.map(id => deleteProduct(id));
      
      await Promise.all(promises);
      toast.success(`${selectedProducts.length} products deleted`);
      onProductsUpdated();
      onSelectionChange([]);
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Failed to delete products');
    } finally {
      setIsProcessing(false);
    }
  };

  const isAllSelected = selectedProducts.length === products.length && products.length > 0;
  const isPartiallySelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isAllSelected}
            ref={(el) => {
              if (el) {
                const checkboxElement = el as HTMLElement & { indeterminate?: boolean };
                if (checkboxElement) {
                  checkboxElement.indeterminate = isPartiallySelected;
                }
              }
            }}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            Select All
          </span>
        </div>

        {selectedProducts.length > 0 && (
          <>
            <Badge variant="secondary">
              {selectedProducts.length} selected
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isProcessing}>
                  Bulk Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleBulkEnable}>
                  <Eye className="mr-2 h-4 w-4" />
                  Enable Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBulkDisable}>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Disable Selected
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
