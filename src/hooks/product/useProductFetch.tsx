
import { useState, useEffect } from "react";
import { Product, Category } from "@/types";
import { fetchProducts } from "@/services/product/productFetch";
import { fetchCategories } from "@/services/category/categoryFetch";
import { toast } from "sonner";

export function useProductFetch(storeId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Add refresh function for external calls
  const refreshProducts = () => {
    console.log('🔄 Manually refreshing products...');
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    async function loadData() {
      try {
        if (!storeId) {
          console.log("useProductFetch: No storeId provided");
          setIsLoading(false);
          setProducts([]);
          setCategories([]);
          return;
        }

        console.log("useProductFetch: Loading data for store:", storeId, "trigger:", refreshTrigger);
        setIsLoading(true);
        setError(null);
        
        // Fetch both products and categories in parallel
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(storeId),
          fetchCategories(storeId)
        ]);
        
        console.log("useProductFetch: Fetched products:", productsData.length);
        console.log("useProductFetch: Fetched categories:", categoriesData.length);
        
        setProducts(productsData);
        
        // Filter and sort categories for POS display
        const { prepareCategoriesForPOS } = await import('@/utils/categoryOrdering');
        const preparedCategories = prepareCategoriesForPOS(categoriesData);

        setCategories(preparedCategories);
        
        if (productsData.length === 0) {
          console.warn("useProductFetch: No products found for store:", storeId);
        }
      } catch (error) {
        console.error("useProductFetch: Error loading data:", error);
        setError(error instanceof Error ? error : new Error("Failed to load data"));
        toast.error("Failed to load products and categories");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [storeId, refreshTrigger]);

  return { products, categories, isLoading, error, refreshProducts };
}
