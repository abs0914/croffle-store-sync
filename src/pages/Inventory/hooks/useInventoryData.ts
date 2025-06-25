
import { useState, useEffect } from 'react';
import { Product, Category } from '@/types';
import { useStore } from '@/contexts/StoreContext';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '@/services/productService';
import { fetchCategories } from '@/services/categoryService';

export const useInventoryData = () => {
  const { currentStore } = useStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('products');

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', currentStore?.id],
    queryFn: () => currentStore?.id ? fetchProducts(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', currentStore?.id],
    queryFn: () => currentStore?.id ? fetchCategories(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
  });

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || product.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const isLoading = isLoadingProducts || isLoadingCategories;

  return {
    currentStore,
    products,
    categories,
    isLoading,
    activeCategory,
    setActiveCategory,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
  };
};
