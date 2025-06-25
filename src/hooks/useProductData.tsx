
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types';
import { toast } from 'sonner';

export function useProductData(storeId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (!storeId) {
      setProducts([]);
      setCategories([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch products
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('name');

        if (productError) throw productError;

        // Transform to ensure stock_quantity is used
        const transformedProducts: Product[] = (productData || []).map(item => ({
          ...item,
          stock_quantity: item.stock_quantity || 0,
        }));

        // Fetch categories
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('name');

        if (categoryError) throw categoryError;

        setProducts(transformedProducts);
        setCategories(categoryData || []);
      } catch (error) {
        console.error('Error fetching product data:', error);
        toast.error('Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [storeId]);

  return {
    products,
    categories,
    isLoading,
    activeCategory,
    setActiveCategory,
  };
}
