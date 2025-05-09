
import { useCallback } from "react";
import { Product } from "@/types";
import { toast } from "sonner";

export function useProductExportImport(products: Product[], storeId: string | null, refetch?: () => void) {
  // Handle export to CSV
  const handleExportCSV = useCallback(() => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }
    
    try {
      // Generate CSV content
      const headers = ['Name', 'SKU', 'Price', 'Stock Quantity', 'Status'];
      const csvContent = [
        headers.join(','),
        ...products.map(product => [
          `"${product.name}"`,
          `"${product.sku}"`,
          product.price,
          product.stock_quantity || product.stockQuantity || 0,
          product.is_active || product.isActive ? 'Active' : 'Inactive'
        ].join(','))
      ].join('\n');
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `products-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Products exported to CSV");
    } catch (error) {
      console.error("Error exporting products to CSV:", error);
      toast.error("Failed to export products");
    }
  }, [products, storeId]);
  
  // Handle import click
  const handleImportClick = useCallback(() => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }
    
    // Create file input and trigger click
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv';
    fileInput.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            // Process CSV file
            const csvData = event.target?.result as string;
            // Here we would typically send this data to the backend
            console.log("CSV data to import:", csvData);
            toast.success("Product import started");
            // In a real app, we would process this data and update the state
            if (refetch) {
              setTimeout(refetch, 2000);
            }
          } catch (error) {
            console.error("Error importing products:", error);
            toast.error("Failed to import products");
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  }, [storeId, refetch]);
  
  // Handle template download
  const handleDownloadTemplate = useCallback(() => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }
    
    try {
      // Generate template CSV
      const headers = ['Name', 'Description', 'Category', 'Price', 'SKU', 'Stock Quantity'];
      const exampleRow = ['"Classic Croffle"', '"Original butter croffle with sugar"', '"Classic"', '129', '"CRF-001"', '50'];
      const csvContent = `${headers.join(',')}\n${exampleRow.join(',')}`;
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'product-import-template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Product import template downloaded");
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Failed to download template");
    }
  }, [storeId]);

  return {
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate
  };
}
