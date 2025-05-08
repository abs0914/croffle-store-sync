import { useState, useEffect } from "react";
import { Product, Category } from "@/types";
import { toast } from "sonner";

export function useProductData(storeId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        if (!storeId) {
          // Reset data when no store is selected
          setProducts([]);
          setCategories([]);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        // In a real implementation, we would pass the store ID to these functions
        const productsResponse = await fetch(`/api/products?storeId=${storeId}`);
        const categoriesResponse = await fetch(`/api/categories?storeId=${storeId}`);
        
        if (!productsResponse.ok || !categoriesResponse.ok) {
          throw new Error("Failed to fetch data");
        }
        
        // Mock data for now
        const mockProducts: Product[] = [
          {
            id: "1",
            name: "Classic Croffle",
            description: "Original butter croffle with sugar",
            price: 129,
            category_id: "classic",
            categoryId: "classic",
            image_url: "https://images.unsplash.com/photo-1596068587619-e4b11c7a3488",
            image: "https://images.unsplash.com/photo-1596068587619-e4b11c7a3488",
            is_active: true,
            isActive: true,
            stock_quantity: 50,
            stockQuantity: 50,
            sku: "CRF-CLS-001"
          },
          {
            id: "2",
            name: "Chocolate Croffle",
            description: "Butter croffle with chocolate drizzle",
            price: 149,
            category_id: "classic",
            categoryId: "classic",
            image_url: "https://images.unsplash.com/photo-1605265036003-3f548c1d5fbe",
            image: "https://images.unsplash.com/photo-1605265036003-3f548c1d5fbe",
            is_active: true,
            isActive: true,
            stock_quantity: 45,
            stockQuantity: 45,
            sku: "CRF-CLS-002"
          },
          {
            id: "3",
            name: "Strawberry Croffle",
            description: "Butter croffle with fresh strawberries",
            price: 159,
            category_id: "fruity",
            categoryId: "fruity",
            image_url: "https://images.unsplash.com/photo-1527515848755-3cd4faffd671",
            image: "https://images.unsplash.com/photo-1527515848755-3cd4faffd671",
            is_active: true,
            isActive: true,
            stock_quantity: 35,
            stockQuantity: 35,
            sku: "CRF-FRT-001"
          },
          {
            id: "4",
            name: "Blueberry Croffle",
            description: "Butter croffle with blueberry compote",
            price: 159,
            category_id: "fruity",
            categoryId: "fruity",
            image_url: "https://images.unsplash.com/photo-1585241938243-379a196fe14e",
            image: "https://images.unsplash.com/photo-1585241938243-379a196fe14e",
            is_active: true,
            isActive: true,
            stock_quantity: 30,
            stockQuantity: 30,
            sku: "CRF-FRT-002"
          },
          {
            id: "5",
            name: "Premium Nutella Croffle",
            description: "Butter croffle with premium Nutella and nuts",
            price: 189,
            category_id: "premium",
            categoryId: "premium",
            image_url: "https://images.unsplash.com/photo-1663149287692-5cb81f1c544c",
            image: "https://images.unsplash.com/photo-1663149287692-5cb81f1c544c",
            is_active: true,
            isActive: true,
            stock_quantity: 25,
            stockQuantity: 25,
            sku: "CRF-PRM-001"
          },
          {
            id: "6",
            name: "Premium Matcha Croffle",
            description: "Butter croffle with premium matcha cream",
            price: 189,
            category_id: "premium",
            categoryId: "premium",
            image_url: "https://images.unsplash.com/photo-1638984496691-fdd2fc3c92ba",
            image: "https://images.unsplash.com/photo-1638984496691-fdd2fc3c92ba",
            is_active: true,
            isActive: true,
            stock_quantity: 20,
            stockQuantity: 20,
            sku: "CRF-PRM-002"
          }
        ];
        
        const mockCategories: Category[] = [
          {
            id: "classic",
            name: "Classic Croffle",
            is_active: true,
            isActive: true
          },
          {
            id: "fruity",
            name: "Fruity",
            is_active: true,
            isActive: true
          },
          {
            id: "premium",
            name: "Premium Croffle",
            is_active: true,
            isActive: true
          }
        ];
        
        setProducts(mockProducts);
        setCategories(mockCategories);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [storeId]);

  // Filter products based on search term and active tab
  const filteredProducts = products.filter(product => {
    // First apply search filter
    const matchesSearch = searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
    // Then apply tab filter
    switch (activeTab) {
      case "active":
        return matchesSearch && product.is_active;
      case "inactive":
        return matchesSearch && !product.is_active;
      case "low-stock":
        return matchesSearch && product.stock_quantity <= 10;
      default:
        return matchesSearch;
    }
  });
  
  // Handle export to CSV
  const handleExportCSV = () => {
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
          product.stock_quantity,
          product.is_active ? 'Active' : 'Inactive'
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
  };
  
  // Handle import click
  const handleImportClick = () => {
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
          } catch (error) {
            console.error("Error importing products:", error);
            toast.error("Failed to import products");
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };
  
  // Handle template download
  const handleDownloadTemplate = () => {
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
  };

  return { 
    products, 
    categories, 
    filteredProducts,
    isLoading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    handleExportCSV,
    handleImportClick,
    handleDownloadTemplate
  };
}
