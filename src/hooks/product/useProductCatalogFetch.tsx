
import { useState, useEffect } from "react";
import { Product, Category } from "@/types";
import { fetchProductCatalogForPOS } from "@/services/productCatalog/productCatalogFetch";
import { fetchCategories } from "@/services/category/categoryFetch";
import { toast } from "sonner";

export function useProductCatalogFetch(storeId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (!storeId) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError(null);
        
        // Fetch products from product_catalog and categories in parallel
        const [productsData, categoriesData] = await Promise.all([
          fetchProductCatalogForPOS(storeId),
          fetchCategories(storeId)
        ]);
        
        setProducts(productsData);
        
        // Filter out the "Desserts" category
        const filteredCategories = categoriesData.filter(
          category => category.name.toLowerCase() !== "desserts"
        );
        
        setCategories(filteredCategories);
      } catch (error) {
        console.error("Error loading product catalog data:", error);
        setError(error instanceof Error ? error : new Error("Failed to load data"));
        toast.error("Failed to load products and categories");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [storeId]);

  return { products, categories, isLoading, error };
}
