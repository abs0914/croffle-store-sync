
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types';
import { toast } from 'sonner';

export function useProductCatalogData(storeId: string | null) {
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

        // Fetch products from product_catalog
        const { data: productData, error: productError } = await supabase
          .from('product_catalog')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_available', true)
          .order('display_order');

        if (productError) throw productError;

        // Transform to match Product interface
        const transformedProducts: Product[] = (productData || []).map(item => ({
          id: item.id,
          name: item.product_name,
          sku: `PC-${item.id}`,
          description: item.description || '',
          price: item.price,
          stock_quantity: 999, // Assume always available for catalog items
          store_id: item.store_id,
          image_url: item.image_url,
          is_active: item.is_available,
          created_at: item.created_at,
          updated_at: item.updated_at,
          category_id: null,
          barcode: null,
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
        console.error('Error fetching product catalog data:', error);
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
