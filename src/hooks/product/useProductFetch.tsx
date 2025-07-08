
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

        console.log("useProductFetch: Loading data for store:", storeId);
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
        
        // Filter out the "Desserts" category
        const filteredCategories = categoriesData.filter(
          category => category.name.toLowerCase() !== "desserts"
        );
        
        setCategories(filteredCategories);
        
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
  }, [storeId]);

  return { products, categories, isLoading, error };
}
