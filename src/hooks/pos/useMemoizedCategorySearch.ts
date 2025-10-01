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

  // Memoize products by category
  const productsByCategory = useMemo(() => {
    const categoryMap = new Map<string, Product[]>();
    
    products.forEach(product => {
      const categoryName = getCategoryName(product.category_id);
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName)!.push(product);
    });
    
    return categoryMap;
  }, [products, getCategoryName]);

  // Cached category search function
  const getProductsForCategory = useCallback((categoryName: string): Product[] => {
    console.log(`Getting products for category: "${categoryName}"`);
    const result = productsByCategory.get(categoryName) || [];
    console.log(`Products in "${categoryName}" category:`, { count: result.length });
    return result;
  }, [productsByCategory]);

  return {
    getCategoryName,
    getProductsForCategory,
    productsByCategory
  };
}
