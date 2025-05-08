
import { useState, useEffect } from "react";
import { Product, Category } from "@/types";
import { fetchProducts } from "@/services/product/productFetch";
import { fetchCategories } from "@/services/categoryService";
import { toast } from "sonner";

export function useProductData(storeId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        if (!storeId) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(storeId),
          fetchCategories(storeId)
        ]);
        
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load products");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [storeId]);

  return { products, categories, isLoading };
}
