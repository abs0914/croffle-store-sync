import { useMemo, useCallback } from 'react';
import { Product, Category } from '@/types';

interface CategorySearchOptions {
  products: Product[];
  categories: Category[];
}

export function useMemoizedCategorySearch({ products, categories }: CategorySearchOptions) {
  // Memoize category name lookup
  const getCategoryName = useCallback((categoryId: string | undefined): string => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  }, [categories]);

  // Memoize products by category with Mini Croffle special handling
  const productsByCategory = useMemo(() => {
    const categoryMap = new Map<string, Product[]>();
    
    products.forEach(product => {
      const categoryName = getCategoryName(product.category_id);
      
      // Special handling for Mini Croffle products
      const isMini = product.name?.toLowerCase().includes("mini");
      if (isMini) {
        if (!categoryMap.has("Mini Croffle")) {
          categoryMap.set("Mini Croffle", []);
        }
        categoryMap.get("Mini Croffle")!.push(product);
      }
      
      // Add to regular category as well
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(product);
    });
    
    // Deduplicate products in each category by product ID
    categoryMap.forEach((productList, categoryName) => {
      const uniqueProducts = Array.from(
        new Map(productList.map(p => [p.id, p])).values()
      );
      categoryMap.set(categoryName, uniqueProducts);
    });
    
    return categoryMap;
  }, [products, getCategoryName]);

  // Cached category search function with debug logs removed for performance
  const getProductsForCategory = useCallback((categoryName: string): Product[] => {
    const result = productsByCategory.get(categoryName) || [];
    return result;
  }, [productsByCategory]);

  return {
    getCategoryName,
    getProductsForCategory,
    productsByCategory
  };
}
